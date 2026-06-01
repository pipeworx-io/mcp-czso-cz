interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Czech Statistical Office (Český statistický úřad, ČSÚ) open-data MCP.
 *
 * Keyless. Two confirmed layers on https://data.csu.gov.cz/api :
 *   - Catalog (/katalog/v1/sady ...) — browse "datové sady" (datasets) + rich metadata.
 *   - Data    (/dotaz/v1 ...)        — observations as JSON-stat 2.0 and a cheap content summary.
 *
 * Content is Czech. Pass Accept-Language: en for English labels where available
 * (most dimension/category labels are Czech-only). Key catalog fields:
 *   kod = dataset id, verze = version, nazev = title (label), stav = status,
 *   urovneTypObdobi = available time levels, urovneTypUzemi = available territory levels.
 *
 * Verified live (curl) 2026-06: catalog list (781 datasets), dataset detail,
 * /dotaz/v1/metadata/sady/{kod}?verze= (content summary), and
 * /dotaz/v1/data/sady/{kod}?verze= (full dataset as JSON-stat 2.0). The data
 * endpoint REQUIRES the version; it is resolved automatically from the catalog
 * when not supplied. Datasets are full cross-products and can be large (1MB+).
 */


const CATALOG = 'https://data.csu.gov.cz/api/katalog/v1';
const DATA = 'https://data.csu.gov.cz/api/dotaz/v1';
const UA = 'pipeworx-mcp-czso-cz/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'list_datasets',
    description:
      "Browse the Czech Statistical Office (ČSÚ) open-data catalog of datasets ('datové sady'). " +
      'Returns id (kod), version (verze), Czech title (nazev), status, and available time/territory levels. ' +
      'The full catalog is ~781 datasets; filter by a case-insensitive substring of the Czech title (the API has no server-side search) and page with limit/offset.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Case-insensitive substring matched against the Czech title (nazev), e.g. "rozvody", "inflace", "mzdy".' },
        limit: { type: 'number', description: 'Max rows to return (default 25, max 200).' },
        offset: { type: 'number', description: 'Rows to skip for paging (default 0).' },
      },
    },
  },
  {
    name: 'dataset_detail',
    description:
      'Full catalog metadata for one ČSÚ dataset by id (kod): description, keywords, indicators (ukazatele), ' +
      'dimension variants (variantyDimenze), selection rules, update periodicity and themes. Catalog layer only — use data_summary / get_data for the actual numbers.',
    inputSchema: {
      type: 'object',
      properties: { kod: { type: 'string', description: 'Dataset id, e.g. "OBY05B03". Get it from list_datasets.' } },
      required: ['kod'],
    },
  },
  {
    name: 'data_summary',
    description:
      'Cheap content summary for a ČSÚ dataset from the data layer: number of data cells (pocetUdaju), ' +
      'covered time range (casovaDimenzeOd/Do), per-dimension value counts, and last-change/publish times. ' +
      'Use this before get_data to gauge size, since full datasets can be large. Version (verze) is auto-resolved from the catalog if omitted.',
    inputSchema: {
      type: 'object',
      properties: {
        kod: { type: 'string', description: 'Dataset id, e.g. "OBY05B03".' },
        verze: { type: 'string', description: 'Dataset version. Optional — defaults to the latest version from the catalog.' },
      },
      required: ['kod'],
    },
  },
  {
    name: 'get_data',
    description:
      'Fetch the actual observations/values for a ČSÚ dataset as JSON-stat 2.0 (dimensions in `id`/`dimension`, ' +
      'cell counts in `size`, numbers in `value`). Verified live. NOTE: returns the complete dataset as a full ' +
      'cross-product, which is often large (hundreds of thousands of cells, 1MB+) — call data_summary first to ' +
      'check pocetUdaju. Version (verze) is auto-resolved from the catalog if omitted.',
    inputSchema: {
      type: 'object',
      properties: {
        kod: { type: 'string', description: 'Dataset id, e.g. "OBY05B03". Get it from list_datasets.' },
        verze: { type: 'string', description: 'Dataset version. Optional — defaults to the latest version from the catalog.' },
        lang: { type: 'string', description: 'Accept-Language for labels, e.g. "en" or "cs" (default). Most category labels are Czech-only regardless.' },
      },
      required: ['kod'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'list_datasets': {
      const all = (await czsoGet(`${CATALOG}/sady`)) as Array<Record<string, unknown>>;
      const query = (args.query as string | undefined)?.trim().toLowerCase();
      const filtered = query
        ? all.filter((d) => typeof d.nazev === 'string' && (d.nazev as string).toLowerCase().includes(query))
        : all;
      const offset = clampInt(args.offset, 0, 0, Number.MAX_SAFE_INTEGER);
      const limit = clampInt(args.limit, 25, 1, 200);
      return {
        total: filtered.length,
        offset,
        limit,
        datasets: filtered.slice(offset, offset + limit),
      };
    }

    case 'dataset_detail':
      return czsoGet(`${CATALOG}/sady/${encodeURIComponent(reqStr(args, 'kod', '"OBY05B03"'))}`);

    case 'data_summary': {
      const kod = reqStr(args, 'kod', '"OBY05B03"');
      const verze = await resolveVerze(kod, args.verze as string | undefined);
      return czsoGet(`${DATA}/metadata/sady/${encodeURIComponent(kod)}?verze=${encodeURIComponent(verze)}`);
    }

    case 'get_data': {
      const kod = reqStr(args, 'kod', '"OBY05B03"');
      const verze = await resolveVerze(kod, args.verze as string | undefined);
      const lang = typeof args.lang === 'string' && args.lang.trim() ? args.lang.trim() : undefined;
      return czsoGet(`${DATA}/data/sady/${encodeURIComponent(kod)}?verze=${encodeURIComponent(verze)}`, lang);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/** Resolve the dataset version, defaulting to the latest from the catalog detail. */
async function resolveVerze(kod: string, supplied: string | undefined): Promise<string> {
  if (typeof supplied === 'string' && supplied.trim()) return supplied.trim();
  const detail = (await czsoGet(`${CATALOG}/sady/${encodeURIComponent(kod)}`)) as Record<string, unknown>;
  const verze = detail?.verze;
  if (typeof verze !== 'string' || !verze) {
    throw new Error(`CZSO: could not resolve version for dataset "${kod}". Pass verze explicitly.`);
  }
  return verze;
}

async function czsoGet(url: string, lang?: string): Promise<unknown> {
  const headers: Record<string, string> = { Accept: 'application/json', 'User-Agent': UA };
  if (lang) headers['Accept-Language'] = lang;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`CZSO: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  return v.trim();
}

function clampInt(v: unknown, def: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
