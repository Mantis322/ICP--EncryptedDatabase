import { useState, useEffect } from 'react';
import { test_backend } from 'declarations/test_backend';
import { AuthClient } from '@dfinity/auth-client';

const INTERNET_IDENTITY = process.env.CANISTER_ID_INTERNET_IDENTITY;

function App() {
  const [authClient, setAuthClient] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [identity, setIdentity] = useState(null);
  const [userPrincipal, setUserPrincipal] = useState(null);
  const [tables, setTables] = useState([]);
  const [newTableName, setNewTableName] = useState('');
  const [newTableColumns, setNewTableColumns] = useState(['']);
  const [selectedTable, setSelectedTable] = useState(null);
  const [newRowData, setNewRowData] = useState({});
  const [queryResult, setQueryResult] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [allData, setAllData] = useState([]);

  useEffect(() => {
    initAuth();
    injectKeyframes();
  }, []);

  const injectKeyframes = () => {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(spinnerKeyframes));
    document.head.appendChild(style);
  };

  const initAuth = async () => {
    const client = await AuthClient.create();
    setAuthClient(client);

    const isAuthenticated = await client.isAuthenticated();
    setIsAuthenticated(isAuthenticated);

    if (isAuthenticated) {
      const identity = client.getIdentity();
      setIdentity(identity);
      const principal = identity.getPrincipal();
      setUserPrincipal(principal);
      fetchTables(principal);
    }
  };

  const login = async () => {
    const internetIdentityUrl = `http://${INTERNET_IDENTITY}.localhost:4943/`;
    authClient.login({
      identityProvider: internetIdentityUrl,
      onSuccess: async () => {
        setIsAuthenticated(true);
        const identity = await authClient.getIdentity();
        setIdentity(identity);
        const principal = identity.getPrincipal();
        setUserPrincipal(principal);
        fetchTables(principal);
      },
      onError: (error) => {
        showError(`Login failed: ${error}`);
      },
    });
  };

  const logout = async () => {
    await authClient.logout();
    setIsAuthenticated(false);
    setIdentity(null);
    setUserPrincipal(null);
    setTables([]);
    setSelectedTable(null);
    setNewRowData({});
    setQueryResult([]);
    setNewTableName('');
    setNewTableColumns(['']);
    setAllData([]);
  };

  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const fetchTables = async (principal) => {
    setIsLoading(true);
    try {
      const tableList = await test_backend.listTables(principal);
      setTables(tableList);
    } catch (err) {
      showError(`Failed to fetch tables: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTable = async () => {
    setIsLoading(true);
    try {
      const result = await test_backend.createTable(userPrincipal, newTableName, newTableColumns.filter(col => col !== ''));
      if ('err' in result) {
        throw new Error(result.err);
      }
      setNewTableName('');
      setNewTableColumns(['']);
      fetchTables(userPrincipal);
    } catch (err) {
      showError(`Failed to create table: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddColumn = () => {
    setNewTableColumns([...newTableColumns, '']);
  };

  const handleRemoveColumn = (index) => {
    const updatedColumns = newTableColumns.filter((_, i) => i !== index);
    setNewTableColumns(updatedColumns);
  };

  const handleColumnChange = (index, value) => {
    const updatedColumns = [...newTableColumns];
    updatedColumns[index] = value;
    setNewTableColumns(updatedColumns);
  };

  const handleSelectTable = async (tableName) => {
    setIsLoading(true);
    try {
      const details = await test_backend.getTableDetails(userPrincipal, tableName);
      if ('ok' in details) {
        setSelectedTable(details.ok);
        setNewRowData({});
      } else {
        throw new Error('Failed to get table details');
      }
    } catch (err) {
      showError(`Failed to select table: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsertRow = async () => {
    setIsLoading(true);
    try {
      const values = selectedTable.columns.map(col => newRowData[col] || '');
      const result = await test_backend.insertInto(userPrincipal, selectedTable.name, values);
      if ('err' in result) {
        throw new Error(result.err);
      }
      setNewRowData({});
      handleSelectTable(selectedTable.name);
    } catch (err) {
      showError(`Failed to insert row: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuery = async (columnName) => {
    setIsLoading(true);
    setAllData([]);
    try {
      const result = await test_backend.select(userPrincipal, selectedTable.name, columnName);
      if ('ok' in result) {
        setQueryResult(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (err) {
      showError(`Failed to query data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryAll = async () => {
    setIsLoading(true);
    setQueryResult([]);
    try {
      const result = await test_backend.selectAll(userPrincipal, selectedTable.name);
      if ('ok' in result) {
        setAllData(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (err) {
      showError(`Failed to query all data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTable = async (tableName) => {
    setIsLoading(true);
    try {
      const result = await test_backend.dropTable(userPrincipal, tableName);
      if ('err' in result) {
        throw new Error(result.err);
      }
      fetchTables(userPrincipal);
      setSelectedTable(null);
    } catch (err) {
      showError(`Failed to delete table: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Encrypted Database</h1>
        {!isAuthenticated ? (
          <button onClick={login} style={buttonPrimaryStyle}>Login with Internet Identity</button>
        ) : (
          <div style={{ textAlign: 'right' }}>
            <p>Logged in as: {userPrincipal ? userPrincipal.toText() : 'Unknown'}</p>
            <button onClick={logout} style={buttonDangerStyle}>Logout</button>
          </div>
        )}
      </div>

      {error && <div style={errorMessageStyle}>{error}</div>}
      {isLoading && (
        <div style={overlayStyle}>
          <div style={spinnerStyle} />
          <p style={loadingTextStyle}>Loading...</p>
        </div>
      )}

      {isAuthenticated && (
        <div>
          <div style={sectionStyle}>
            <h2>Create New Table</h2>
            <div>
              <input
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="Table Name"
                style={inputStyle}
              />
              {newTableColumns.map((col, index) => (
                <div key={index} style={formGroupRowStyle}>
                  <input
                    type="text"
                    value={col}
                    onChange={(e) => handleColumnChange(index, e.target.value)}
                    placeholder={`Column ${index + 1}`}
                    style={inputStyle}
                  />
                  <button onClick={() => handleRemoveColumn(index)} style={buttonDangerStyle}>Remove</button>
                </div>
              ))}
              <div style={{ textAlign: 'right' }}>
                <button onClick={handleAddColumn} style={buttonSecondaryStyle}>Add Column</button>
                <button onClick={handleCreateTable} style={buttonPrimaryStyle}>Create Table</button>
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <h2>Your Tables</h2>
            <ul style={{ listStyleType: 'none', padding: '0' }}>
              {tables.map(table => (
                <li key={table} style={tableListItemStyle}>
                  <span onClick={() => handleSelectTable(table)} style={tableNameStyle}>{table}</span>
                  <button onClick={() => handleDeleteTable(table)} style={{ ...buttonDangerStyle, marginLeft: 'auto' }}>Delete</button>
                </li>
              ))}
            </ul>
          </div>

          {selectedTable && (
            <div style={sectionStyle}>
              <h2>{selectedTable.name}</h2>
              <p>Columns: {selectedTable.columns.join(', ')}</p>
              <p>Rows: {selectedTable.rowCount}</p>

              <h3>Insert New Row</h3>
              {selectedTable.columns.map(col => (
                <input
                  key={col}
                  type="text"
                  value={newRowData[col] || ''}
                  onChange={(e) => setNewRowData({ ...newRowData, [col]: e.target.value })}
                  placeholder={col}
                  style={inputStyle}
                />
              ))}
              <div style={{ textAlign: 'right' }}>
                <button onClick={handleInsertRow} style={buttonPrimaryStyle}>Insert Row</button>
              </div>

              <h3>Query Data</h3>
              <div style={{ textAlign: 'right' }}>
                {selectedTable.columns.map(col => (
                  <button key={col} onClick={() => handleQuery(col)} style={buttonSecondaryStyle}>Query {col}</button>
                ))}
                <button onClick={handleQueryAll} style={buttonSecondaryStyle}>Query All Data</button>
              </div>

              {queryResult.length > 0 && (
                <table style={resultTableStyle}>
                  <thead>
                    <tr>
                      <th style={tableHeaderCellStyle}>Index</th>
                      <th style={tableHeaderCellStyle}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.map((item, index) => (
                      <tr key={index}>
                        <td style={tableCellStyle}>{index + 1}</td>
                        <td style={tableCellStyle}>{item}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {allData.length > 0 && (
                <table style={resultTableStyle}>
                  <thead>
                    <tr>
                      <th style={tableHeaderCellStyle}>Index</th>
                      {selectedTable.columns.map(col => (
                        <th key={col} style={tableHeaderCellStyle}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allData.map((row, index) => (
                      <tr key={index}>
                        <td style={tableCellStyle}>{index + 1}</td>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} style={tableCellStyle}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const overlayStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

const spinnerKeyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const spinnerStyle = {
  border: '4px solid #f3f3f3',
  borderTop: '4px solid #3498db',
  borderRadius: '50%',
  width: '40px',
  height: '40px',
  animation: 'spin 1s linear infinite',
};

const loadingTextStyle = {
  marginTop: '10px',
  fontSize: '18px',
  color: '#3498db',
};

const buttonPrimaryStyle = {
  backgroundColor: '#28a745',
  color: 'white',
  padding: '10px 15px',
  border: 'none',
  cursor: 'pointer',
  borderRadius: '4px',
  fontWeight: 'bold',
  marginLeft: '10px',
};

const buttonSecondaryStyle = {
  backgroundColor: '#17a2b8',
  color: 'white',
  padding: '10px 15px',
  border: 'none',
  cursor: 'pointer',
  borderRadius: '4px',
  fontWeight: 'bold',
  marginLeft: '10px',
};

const buttonDangerStyle = {
  backgroundColor: '#dc3545',
  color: 'white',
  padding: '10px 15px',
  border: 'none',
  cursor: 'pointer',
  borderRadius: '4px',
  fontWeight: 'bold',
  marginLeft: '10px',
};

const inputStyle = {
  width: '100%',
  padding: '10px',
  marginBottom: '10px',
  border: '1px solid #ccc',
  borderRadius: '4px',
};

const formGroupRowStyle = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '10px',
};

const sectionStyle = {
  marginBottom: '30px',
  padding: '20px',
  backgroundColor: '#fff',
  borderRadius: '8px',
  boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
};

const tableListItemStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px',
  marginBottom: '5px',
  borderRadius: '4px',
  backgroundColor: '#f1f1f1',
};

const tableNameStyle = {
  cursor: 'pointer',
  fontWeight: 'bold',
  flex: '1',
};

const errorMessageStyle = {
  color: '#dc3545',
  fontWeight: 'bold',
  marginBottom: '20px',
};

const loadingSpinnerStyle = {
  color: '#007bff',
  fontWeight: 'bold',
  marginBottom: '20px',
};

const resultTableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '20px',
};

const tableHeaderCellStyle = {
  borderBottom: '2px solid #ddd',
  textAlign: 'left',
  padding: '10px',
  backgroundColor: '#f8f8f8',
  fontWeight: 'bold',
};

const tableCellStyle = {
  borderBottom: '1px solid #ddd',
  textAlign: 'left',
  padding: '10px',
};

export default App
