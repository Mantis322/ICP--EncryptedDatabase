import { useState, useEffect } from 'react';
import { test_backend } from 'declarations/test_backend';
import { AuthClient } from '@dfinity/auth-client';
import '../assets/main.css';

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
  }, []);

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
      // Refresh table details after inserting
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
    <div className="App relative">
      {isLoading && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white p-5 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-700 font-semibold">Yükleniyor...</p>
          </div>
        </div>
      )}
  
      <h1>Encrypted Database</h1>
      
      {!isAuthenticated ? (
        <button onClick={login} className="auth-button">Login with Internet Identity</button>
      ) : (
        <div className="user-info">
          <p>Logged in as: {userPrincipal ? userPrincipal.toText() : 'Unknown'}</p>
          <button onClick={logout} className="auth-button">Logout</button>
        </div>
      )}
  
      {error && <div className="error-message">{error}</div>}
      
      {isAuthenticated && (
        <>
          <div className="create-table-section">
            <h2>Create New Table</h2>
            <input
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              placeholder="Table Name"
            />
            {newTableColumns.map((col, index) => (
              <div key={index} className="column-input">
                <input
                  type="text"
                  value={col}
                  onChange={(e) => handleColumnChange(index, e.target.value)}
                  placeholder={`Column ${index + 1}`}
                />
                <button onClick={() => handleRemoveColumn(index)}>Remove</button>
              </div>
            ))}
            <button onClick={handleAddColumn}>Add Column</button>
            <button onClick={handleCreateTable}>Create Table</button>
          </div>
          
          <div className="tables-list">
            <h2>Your Tables</h2>
            <ul>
              {tables.map(table => (
                <li key={table}>
                  <span onClick={() => handleSelectTable(table)}>{table}</span>
                  <button onClick={() => handleDeleteTable(table)} className="delete-button">Delete</button>
                </li>
              ))}
            </ul>
          </div>
          
          {selectedTable && (
            <div className="selected-table">
              <h2>{selectedTable.name}</h2>
              <p>Columns: {selectedTable.columns.join(', ')}</p>
              <p>Rows: {selectedTable.rowCount}</p>
              
              <h3>Insert New Row</h3>
              {selectedTable.columns.map(col => (
                <input
                  key={col}
                  type="text"
                  value={newRowData[col] || ''}
                  onChange={(e) => setNewRowData({...newRowData, [col]: e.target.value})}
                  placeholder={col}
                />
              ))}
              <button onClick={handleInsertRow}>Insert Row</button>
              
              <h3>Query Data</h3>
              <div className="query-buttons">
                {selectedTable.columns.map(col => (
                  <button key={col} onClick={() => handleQuery(col)}>Query {col}</button>
                ))}
                <button onClick={handleQueryAll}>Query All Data</button>
              </div>
              
              {queryResult.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Index</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.map((item, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{item}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              
              {allData.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      {selectedTable.columns.map(col => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td>{rowIndex + 1}</td>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
