# mcp-czso-cz

Czech Statistical Office (Český statistický úřad, ČSÚ) open-data MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Czso Cz data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
