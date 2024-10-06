import Array "mo:base/Array";
import Text "mo:base/Text";
import Nat8 "mo:base/Nat8";
import Iter "mo:base/Iter";
import Blob "mo:base/Blob";
import Option "mo:base/Option";
import Result "mo:base/Result";
import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";

actor EncryptedDatabase {
    // Type definition for a database table
    private type Table = {
        name : Text;          // Name of the table
        columns : [Text];     // List of column names
        rows : [[Blob]];      // List of rows, where each row is a list of encrypted values
        owner : Principal;    // Owner of the table
    };

    // HashMap to store user tables, indexed by Principal (user)
    private let userTables : HashMap.HashMap<Principal, HashMap.HashMap<Text, Table>> = HashMap.HashMap(10, Principal.equal, Principal.hash);

    // Encrypts a Text value and returns it as a Blob
    private func encrypt(data : Text) : Blob {
        // Convert the Text to bytes, encrypt each byte, and convert back to Blob
        let bytes = Blob.toArray(Text.encodeUtf8(data));
        let encryptedBytes = Array.map<Nat8, Nat8>(bytes, func(byte) { 
            byte +% 1  // Simple encryption by incrementing byte value
        });
        Blob.fromArray(encryptedBytes)
    };

    // Decrypts a Blob back to a Text value
    private func decrypt(data : Blob) : Text {
        // Convert Blob to bytes, decrypt each byte, and decode back to Text
        let bytes = Blob.toArray(data);
        let decryptedBytes = Array.map<Nat8, Nat8>(bytes, func(byte) { 
            byte -% 1  // Simple decryption by decrementing byte value
        });
        switch (Text.decodeUtf8(Blob.fromArray(decryptedBytes))) {
            case (null) { "" };  // Return empty string if decoding fails
            case (?text) { text };  // Return the decoded text
        }
    };

    // Retrieves the user's tables or creates a new HashMap if none exist
    private func getUserTables(user : Principal) : HashMap.HashMap<Text, Table> {
        switch (userTables.get(user)) {
            case (null) {
                // Create a new HashMap for the user
                let newHashMap = HashMap.HashMap<Text, Table>(10, Text.equal, Text.hash);
                userTables.put(user, newHashMap);
                newHashMap
            };
            case (?hashMap) { hashMap };  // Return existing HashMap
        }
    };

    // Creates a new table for the caller
    public shared(msg) func createTable(callerId : Principal, name : Text, columns : [Text]) : async Result.Result<(), Text> {
        let userTableMap = getUserTables(callerId);
        switch (userTableMap.get(name)) {
            case (?_) { #err("Table already exists") };  // Error if table already exists
            case (null) {
                // Create a new table
                let newTable : Table = {
                    name = name;
                    columns = columns;
                    rows = [];
                    owner = callerId;
                };
                userTableMap.put(name, newTable);  // Store the new table
                #ok()
            };
        }
    };

    // Inserts a row of values into a specified table
    public shared(msg) func insertInto(callerId : Principal, tableName : Text, values : [Text]) : async Result.Result<(), Text> {
        let userTableMap = getUserTables(callerId);
        switch (userTableMap.get(tableName)) {
            case (null) { #err("Table not found") };  // Error if table is not found
            case (?table) {
                if (table.owner != callerId) {
                    return #err("Access denied: You don't own this table");  // Check ownership
                };
                if (values.size() != table.columns.size()) {
                    return #err("Column count mismatch");  // Check column count
                };
                // Encrypt values and update the table's rows
                let encryptedValues = Array.map<Text, Blob>(values, encrypt);
                let updatedTable : Table = {
                    name = table.name;
                    columns = table.columns;
                    rows = Array.append(table.rows, [encryptedValues]);
                    owner = table.owner;
                };
                userTableMap.put(tableName, updatedTable);  // Store the updated table
                #ok()
            };
        }
    };

    // Selects a specific column from a table for the caller
    public shared query(msg) func select(callerId : Principal, tableName : Text, columnName : Text) : async Result.Result<[Text], Text> {
        let userTableMap = getUserTables(callerId);
        switch (userTableMap.get(tableName)) {
            case (null) { #err("Table not found") };  // Error if table is not found
            case (?table) {
                if (table.owner != callerId) {
                    return #err("Access denied: You don't own this table");  // Check ownership
                };
                let columnIndex = Array.indexOf<Text>(columnName, table.columns, Text.equal);
                switch (columnIndex) {
                    case (null) { #err("Column not found") };  // Error if column is not found
                    case (?index) {
                        // Decrypt values in the specified column and return
                        let result = Array.map<[Blob], Text>(table.rows, func(row) {
                            decrypt(row[index])
                        });
                        #ok(result)
                    };
                };
            };
        }
    };

    // Lists all tables owned by the caller
    public shared query(msg) func listTables(callerId : Principal) : async [Text] {
        let userTableMap = getUserTables(callerId);
        // Return the names of all tables
        Iter.toArray(Iter.map(userTableMap.entries(), func((name, _) : (Text, Table)) : Text { name }));
    };

    // Retrieves details of a specific table
    public shared query(msg) func getTableDetails(callerId : Principal, tableName : Text) : async Result.Result<{name: Text; columns: [Text]; rowCount: Nat}, Text> {
        let userTableMap = getUserTables(callerId);
        switch (userTableMap.get(tableName)) {
            case (null) { #err("Table not found") };  // Error if table is not found
            case (?table) {
                if (table.owner != callerId) {
                    return #err("Access denied: You don't own this table");  // Check ownership
                };
                // Return table details
                #ok({
                    name = table.name;
                    columns = table.columns;
                    rowCount = table.rows.size();  // Count of rows
                });
            };
        }
    };

    // Retrieves all details of a specific table
    public shared query(msg) func selectAll(callerId : Principal, tableName : Text) : async Result.Result<[[Text]], Text> {
        let userTableMap = getUserTables(callerId);
        switch (userTableMap.get(tableName)) {
            case (null) { #err("Table not found") };
            case (?table) {
                if (table.owner != callerId) {
                    return #err("Access denied: You don't own this table");
                };
                let result = Array.map<[Blob], [Text]>(table.rows, func(row) {
                    Array.map<Blob, Text>(row, decrypt)
                });
                #ok(result)
            };
        }
    };

    // Deletes a specified table
    public shared(msg) func dropTable(callerId : Principal, tableName : Text) : async Result.Result<(), Text> {
        let userTableMap = getUserTables(callerId);
        switch (userTableMap.get(tableName)) {
            case (null) { #err("Table not found") };  // Error if table is not found
            case (?table) {
                if (table.owner != callerId) {
                    return #err("Access denied: You don't own this table");  // Check ownership
                };
                ignore userTableMap.remove(tableName);  // Remove the table
                #ok()
            };
        }
    };
}
