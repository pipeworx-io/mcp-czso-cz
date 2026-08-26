# mcp-czso-cz

Czech Statistical Office (Český statistický úřad, ČSÚ) open-data MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `list_datasets` | Browse the Czech Statistical Office (ČSÚ) open-data catalog of datasets ('datové sady'). Returns id (kod), version (verze), Czech title (nazev), status, and available time/territory levels. The full catalog is ~781 datasets; filter by a case-insensitive substring of the Czech title (the API has no server-side search) and page with limit/offset. |
| `dataset_detail` | Full catalog metadata for one ČSÚ dataset by id (kod): description, keywords, indicators (ukazatele), dimension variants (variantyDimenze), selection rules, update periodicity and themes. Catalog layer only — use data_summary / get_data for the actual numbers. |
| `data_summary` | Cheap content summary for a ČSÚ dataset from the data layer: number of data cells (pocetUdaju), covered time range (casovaDimenzeOd/Do), per-dimension value counts, and last-change/publish times. Use this before get_data to gauge size, since full datasets can be large. Version (verze) is auto-resolved from the catalog if omitted. |
| `get_data` | Fetch the actual observations/values for a ČSÚ dataset as JSON-stat 2.0 (dimensions in `id`/`dimension`, cell counts in `size`, numbers in `value`). Verified live. NOTE: returns the complete dataset as a full cross-product, which is often large (hundreds of thousands of cells, 1MB+) — call data_summary first to check pocetUdaju. Version (verze) is auto-resolved from the catalog if omitted. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "czso-cz": {
      "url": "https://gateway.pipeworx.io/czso-cz/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/czso-cz/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Czso Cz data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
