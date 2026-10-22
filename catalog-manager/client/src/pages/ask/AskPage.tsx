import { GenieChat } from '@databricks/appkit-ui/react';

export function AskPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-3">
      <div>
        <h2 className="text-xl font-semibold">Ask your data</h2>
        <p className="text-sm text-muted-foreground">
          Ask in plain language about alerts, customers, transactions, glossary terms or policies. Answers come
          from the Genie space and show the SQL used.
        </p>
      </div>
      <div style={{ height: 640 }}>
        <GenieChat alias="default" />
      </div>
    </div>
  );
}
