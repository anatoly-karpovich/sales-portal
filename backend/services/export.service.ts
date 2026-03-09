type ExportFormat = "csv" | "json";

class ExportService {
  assertSelectedFields(selectedFields: string[], allowedFields: Set<string>): void {
    if (!Array.isArray(selectedFields) || selectedFields.length === 0) {
      throw new Error("EXPORT_VALIDATION:Fields are required");
    }

    const invalidField = selectedFields.find((field) => !allowedFields.has(field));
    if (invalidField) {
      throw new Error(`EXPORT_VALIDATION:Unsupported field '${invalidField}'`);
    }
  }

  pickFields<T extends Record<string, any>>(items: T[], fields: string[]): Record<string, unknown>[] {
    return items.map((item) =>
      fields.reduce<Record<string, unknown>>((acc, field) => {
        const value = item[field];
        acc[field] = this.normalizeFieldValue(value);
        return acc;
      }, {}),
    );
  }

  toCsv(rows: Record<string, unknown>[], fields: string[]): string {
    const header = fields.map((field) => this.escapeCsvValue(field)).join(",");
    const body = rows
      .map((row) =>
        fields
          .map((field) => {
            const value = row[field];
            return this.escapeCsvValue(value === null || value === undefined ? "" : String(value));
          })
          .join(","),
      )
      .join("\n");

    return `${header}\n${body}`;
  }

  buildFileName(prefix: string, format: ExportFormat): string {
    const timestamp = new Date().toISOString().replace(/[:]/g, "-").slice(0, 19);
    return `${prefix}-${timestamp}.${format}`;
  }

  private normalizeFieldValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return "";
    }

    const typedValue = value as { _bsontype?: string; toString?: () => string };
    if (typedValue && typedValue._bsontype === "ObjectId" && typeof typedValue.toString === "function") {
      return typedValue.toString();
    }

    return value;
  }

  private escapeCsvValue(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  }
}

export default new ExportService();
