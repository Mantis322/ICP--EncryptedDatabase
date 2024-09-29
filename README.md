# EncryptedDatabase: Decentralized and Encrypted Database Solution

![ICP Logo](https://internetcomputer.org/img/IC_logo_horizontal.svg)

## 🌟 About the Project

EncryptedDatabase is a decentralized and encrypted database solution that runs on the Internet Computer Protocol (ICP). It helps users store and manage their data safely while using the benefits of blockchain technology.

### 🔑 Features

- **Decentralized**: Runs on ICP, so it doesn't depend on a single central server.
- **Encrypted Data**: All data is stored in an encrypted form for better privacy.
- **Multiple Tables**: Users can create and manage many tables.
- **Secure Access**: Only the owner can access and manage their tables.
- **CRUD Operations**: Supports basic database operations (Create, Read, Update, Delete).

## 🚀 Getting Started

### What You Need

- [DFINITY Canister Developer Kit](https://internetcomputer.org/docs/current/developer-docs/getting-started/install/)
- [Node.js](https://nodejs.org/) (version 20.17 or higher)
- [mops](https://github.com/mops-cli/mops)

### How to Set Up

1. Copy this project to your computer:
   ```
   git clone https://github.com/your-username/EncryptedDatabase.git
   cd EncryptedDatabase
   ```

2. Install mops (if you don't have it):
   ```
   npm install -g mops
   ```

3. Install project dependencies:
   ```
   mops add base
   ```

4. Deploy to the ICP network: (Make sure dfx is running locally in the background)
   ```
   dfx deploy 
   ```

## 🔄 EncryptedDatabase vs. Traditional Database

Here's a simple comparison between EncryptedDatabase and a traditional database:

| Feature | EncryptedDatabase | Traditional Database |
|---------|-------------------|----------------------|
| Data Storage | Decentralized (on ICP) | Centralized server |
| Encryption | Built-in, automatic | Often requires additional setup |
| Access Control | Blockchain-based, secure | Varies, often password-based |
| Scalability | Leverages ICP network | Depends on server capacity |
| Transparency | High (blockchain-based) | Varies, often limited |
| Costs | ICP cycles | Server maintenance, licensing |
| Data Ownership | User retains full control | Often controlled by the service provider |


## 🤝 How to Contribute

We welcome your contributions! Please follow these steps:

1. Fork the project
2. Create a new feature branch (`git checkout -b new-feature`)
3. Make your changes and commit them (`git commit -am 'Add new feature: XYZ'`)
4. Push to your branch (`git push origin new-feature`)
5. Create a Pull Request

## 📜 License

This project is under the [MIT License](LICENSE).

---

⭐️ If you like this project, please give it a star!
