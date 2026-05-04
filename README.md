# ATECOWQT Database Management

This guide explains how to manage MongoDB backups for the ATECOWQT project, including dumping data from the cloud and restoring it to a local environment.

## Prerequisites

- [MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/installation/installation/) (`mongodump`, `mongorestore`) must be installed on your system.

## 1. Create a Backup (Cloud to Local)

To download the latest data from the MongoDB Atlas cluster into a local directory:

```bash
mongodump --uri="your_connection_string" --out=backup_folder
```

*   **`--uri`**: The connection string for the source database.
*   **`--out`**: The directory where the backup files (.bson and .json) will be saved.

## 2. Restore a Backup (Local to Local)

To restore the downloaded backup into your local MongoDB instance (e.g., for development):

```bash
mongorestore --uri="mongodb://localhost:27017" --nsFrom="test.*" --nsTo="ateco.*" --drop backup_folder
```

### Command Flags Explained:
*   **`--uri`**: The connection string for the target (local) database.
*   **`--nsFrom="test.*"`**: Specifies the source namespace (database name in the backup). In our case, the cloud DB was named `test`.
*   **`--nsTo="ateco.*"`**: Specifies the target namespace. This renames the database to `ateco` during the restore.
*   **`--drop`**: (Optional but Recommended) Drops the existing collections in the local database before restoring. Use this if you want a clean sync.
*   **`backup_folder`**: The path to the directory containing the dump files.

## Summary of Operations

| Operation | Command |
| :--- | :--- |
| **Backup** | `mongodump --uri="[CLOUD_URI]" --out=backup_folder` |
| **Restore** | `mongorestore --uri="[LOCAL_URI]" --nsFrom="test.*" --nsTo="ateco.*" --drop backup_folder` |

## Utility Scripts

### Convert PDFs to PNG Images
If you have PDF files in the `recovered_records/` folder that need to be extracted into individual PNG images, use the provided conversion script. 

**Prerequisites:** You must have `poppler` installed (`brew install poppler` on Mac).

To convert all PDFs in the folder:
```bash
./scripts/convert_pdfs.sh
```

To convert a specific PDF:
```bash
./scripts/convert_pdfs.sh recovered_records/your_document.pdf
```
The images will be saved automatically to `recovered_records/new/`.
