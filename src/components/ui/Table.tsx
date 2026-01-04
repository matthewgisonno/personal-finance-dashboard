export function Table({ children }: { children: React.ReactNode }) {
  return <table className="min-w-full divide-y divide-gray-200">{children}</table>;
}

export function TableHeaders({ headers }: { headers: string[] }) {
  return (
    <thead className="bg-gray-50">
      <tr>
        {Array.isArray(headers) &&
          headers?.map((header: string) => {
            return (
              <th
                key={header}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            );
          })}
      </tr>
    </thead>
  );
}

type TableRow = {
  id: string;
  date: string | Date;
  description: string;
  category: string;
  categoryStatus: string;
  categorySource: string;
  amount: number | string;
};

export function TableRows({ rows }: { rows: TableRow[] }) {
  return (
    <tbody className="bg-white divide-y divide-gray-200">
      {rows.map((row: TableRow) => (
        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            <span className="text-gray-500">{new Date(row.date).toLocaleDateString()}</span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            <span className="font-medium text-gray-900">{row.description}</span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            <span
              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${
                          row.categoryStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 animate-pulse'
                            : row.category === 'Uncategorized' || !row.category
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                        }`}
            >
              {row.category || (row.categoryStatus === 'completed' ? 'Uncategorized' : 'Pending...')}
            </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            <span className="text-gray-500 uppercase">{row.categorySource}</span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            <span className="text-gray-900 text-right font-mono">
              ${typeof row.amount === 'string' ? parseFloat(row.amount).toFixed(2) : (row.amount as number)?.toFixed(2)}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  );
}
