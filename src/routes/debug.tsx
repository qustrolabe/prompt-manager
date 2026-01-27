import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  commands,
  type DbError,
  type TableColumn,
  type TableRow,
} from "@/bindings";

export const Route = createFileRoute("/debug")({
  component: DebugPage,
});

interface TableInfo {
  name: string;
  rowCount: number;
}

function DebugPage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbPath, setDbPath] = useState<string>("");

  const loadTables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await commands.getTableNames();
      if (result.status === "error") {
        throw new Error(
          getDbErrorMessage(result.error) || "Failed to load tables",
        );
      }
      const tableNames = result.data;

      // Get row counts for each table
      const tablesWithCounts = await Promise.all(
        tableNames.map(async (name) => {
          const rowsResult = await commands.getTableRows(name);
          if (rowsResult.status === "error") {
            throw new Error(
              getDbErrorMessage(rowsResult.error) ||
                "Failed to load table rows",
            );
          }
          const rows = rowsResult.data;
          return { name, rowCount: rows.length };
        }),
      );
      setTables(tablesWithCounts);

      // Load database path
      const pathResult = await commands.getDatabasePath();
      if (pathResult.status === "ok") {
        setDbPath(pathResult.data);
      }

      // Select first table if none selected
      if (!selectedTable && tablesWithCounts.length > 0) {
        setSelectedTable(tablesWithCounts[0].name);
      } else if (selectedTable) {
        // Refresh data for currently selected table
        const [rowsResult, columnsResult] = await Promise.all([
          commands.getTableRows(selectedTable),
          commands.getTableInfo(selectedTable),
        ]);

        if (rowsResult.status === "error") {
          throw new Error(
            getDbErrorMessage(rowsResult.error) || "Failed to load table rows",
          );
        }
        if (columnsResult.status === "error") {
          throw new Error(
            getDbErrorMessage(columnsResult.error) ||
              "Failed to load table info",
          );
        }

        setTableData(rowsResult.data);
        setTableColumns(columnsResult.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tables");
    } finally {
      setLoading(false);
    }
  }, [selectedTable]);

  const loadTableData = useCallback(async (tableName: string) => {
    setLoading(true);
    setError(null);
    try {
      const [rowsResult, columnsResult] = await Promise.all([
        commands.getTableRows(tableName),
        commands.getTableInfo(tableName),
      ]);

      if (rowsResult.status === "error") {
        throw new Error(
          getDbErrorMessage(rowsResult.error) || "Failed to load table rows",
        );
      }
      if (columnsResult.status === "error") {
        throw new Error(
          getDbErrorMessage(columnsResult.error) || "Failed to load table info",
        );
      }

      setTableData(rowsResult.data);
      setTableColumns(columnsResult.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load table data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable);
    }
  }, [selectedTable, loadTableData]);

  useEffect(() => {
    commands.getDatabasePath().then((result) => {
      if (result.status === "ok") {
        setDbPath(result.data);
      }
    });
  }, []);

  const handleTabClick = (tableName: string) => {
    setSelectedTable(tableName);
  };

  const handleClearTable = async () => {
    if (!selectedTable) return;

    if (
      !confirm(
        `Are you sure you want to clear all rows from "${selectedTable}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await commands.clearTable(selectedTable);
      if (result.status === "error") {
        throw new Error(
          getDbErrorMessage(result.error) || "Failed to clear table",
        );
      }
      await loadTableData(selectedTable);
      // Refresh table counts
      await loadTables();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear table");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await commands.exportDatabaseAsJson();
      if (result.status === "error") {
        throw new Error(
          getDbErrorMessage(result.error) || "Failed to export database",
        );
      }
      const data = result.data;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prompt-manager-db-export-${
        new Date().toISOString().slice(0, 10)
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to export database");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grow bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 font-bold text-2xl text-neutral-900 dark:text-neutral-100">
          Database Debug Panel
        </h1>

        {/* Database Info & Actions Row */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-neutral-600 text-sm dark:text-neutral-400">
            <span className="text-neutral-500">Database:</span>
            <span className="rounded bg-neutral-100 px-2 py-1 font-mono dark:bg-neutral-800">
              {dbPath}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadTables}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading}
              className="rounded-lg bg-green-600 px-3 py-1.5 font-medium text-sm text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              Export JSON
            </button>
            {selectedTable && (
              <button
                type="button"
                onClick={handleClearTable}
                disabled={loading}
                className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                Clear Table
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Horizontal Tabs */}
        <div className="mb-4 border-b border-panel-border">
          <div className="flex gap-1 overflow-x-auto pb-px">
            {tables.map((table) => (
              <button
                type="button"
                key={table.name}
                onClick={() => handleTabClick(table.name)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2 font-medium text-sm transition-colors ${
                  selectedTable === table.name
                    ? "bg-panel border border-b-0 border-panel-border text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <span>{table.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    selectedTable === table.name
                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {table.rowCount}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="mb-4 text-neutral-600 dark:text-neutral-400">
            Loading...
          </div>
        )}

        {/* Table Content */}
        {selectedTable && !loading && (
          <div className="overflow-hidden rounded-xl border border-panel-border bg-panel">
            {tableData.length === 0
              ? (
                <div className="p-8 text-center text-neutral-500 italic dark:text-neutral-500">
                  No rows in this table
                </div>
              )
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-neutral-100 dark:bg-neutral-800">
                        {tableColumns.map((col) => (
                          <th
                            key={col.name}
                            className="border-b border-panel-border px-4 py-3 text-left font-medium text-neutral-700 dark:text-neutral-300"
                          >
                            <div className="flex flex-col">
                              <span>{col.name}</span>
                              <span className="font-normal text-neutral-500 text-xs">
                                {col.type}
                                {col.pk === 1 && " PK"}
                                {col.notnull === 1 && " NOT NULL"}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
                        >
                          {tableColumns.map((col) => (
                            <td
                              key={col.name}
                              className="max-w-xs truncate border-b border-panel-border px-4 py-2 font-mono text-neutral-800 text-xs dark:text-neutral-200"
                              title={String(row[col.name] ?? "")}
                            >
                              {formatCellValue(row[col.name])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}

        {tables.length === 0 && !loading && (
          <div className="rounded-xl border border-panel-border bg-panel py-8 text-center text-neutral-500 dark:text-neutral-500">
            No tables found in the database. The database may not have been
            initialized yet.
          </div>
        )}
      </div>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null) return "NULL";
  if (value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string" && value.length > 50) {
    return value.slice(0, 50) + "...";
  }
  return String(value);
}

function getDbErrorMessage(error: DbError): string {
  if ("Database" in error) return error.Database;
  if ("NotFound" in error) return error.NotFound;
  if ("Serialization" in error) return error.Serialization;
  return "Unknown error";
}
