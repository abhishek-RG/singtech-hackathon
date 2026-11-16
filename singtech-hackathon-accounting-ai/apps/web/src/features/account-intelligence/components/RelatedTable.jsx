// A related list on the Account page: dense, readable rows that become cards on phones.
// columns: [{ key, label, render(row), numeric?, wide? }]

export default function RelatedTable({ caption, columns, rows, empty }) {
  if (!rows.length) {
    return (
      <div className="card acct-message">
        <p className="acct-empty__title">{caption}</p>
        <p className="text-muted">{empty}</p>
      </div>
    );
  }
  return (
    <div className="acct-table-wrap">
      <table className="acct-table acct-table--related">
        <caption className="acct-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cellClass(c)}>
                <span className="acct-th">{c.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((c, i) => (
                <td
                  key={c.key}
                  className={cellClass(c, i === 0 && 'acct-related-first')}
                  data-label={c.label}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function cellClass(column, extra) {
  const names = [column.numeric && 'acct-num', column.wide && 'acct-wide', extra].filter(Boolean);
  return names.length ? names.join(' ') : undefined;
}
