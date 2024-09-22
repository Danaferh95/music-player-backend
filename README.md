
# 🎵 MP3 Storage Backend

This project is a backend service that allows users to upload, store, and manage their MP3 files online. The backend connects to a Google Drive folder to store the files and interacts with a PostgreSQL database to manage user data, track information, and more. This backend is designed to work with a React frontend for a complete music storage and playback experience.

## 🚀 Project Purpose

The main goal of this project is to provide a platform where users can store their MP3 files in their own database and Google Drive folder, allowing them to manage and listen to their music online from any device.

## 🛠️ Technologies Used

- **Node.js**: JavaScript runtime environment for building the backend server.
- **Express**: Web framework for creating the API endpoints.
- **PostgreSQL**: Relational database to store user and track information.
- **Multer**: Middleware for handling file uploads.
- **CORS**: Cross-Origin Resource Sharing to handle permissions for requests from the frontend.
- **Body-parser**: Middleware for parsing incoming request bodies in a middleware before your handlers.
- **Music-metadata-browser**: Extract metadata (artist, title, etc.) from uploaded MP3 files.
- **Express-session**: Manage user sessions for login/logout functionality.
- **Google APIs**: Integration with Google Drive for file storage.

## ⚙️ Getting Started

Follow these steps to set up and run the backend server on your local machine.

### 1. Clone the Repository

```bash
git clone <repository_url>
cd mp3-storage-backend
```

### 2. Install Dependencies

Make sure you have [Node.js](https://nodejs.org/) installed on your machine. Then, install the necessary dependencies by running:

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory of your project with the following content:

```env
PORT=4000
BASE_URL=http://localhost:4000

# Google Drive API credentials
GOOGLE_DRIVE_FOLDER_ID=<Your Google Drive Folder ID>
GOOGLE_CREDENTIALS=<Your Base64 Encoded Google Credentials>

# Database configuration
DB_HOST=<Your PostgreSQL Host>
DB_PORT=<Your PostgreSQL Port (default: 5432)>
DB_DATABASE=<Your PostgreSQL Database Name>
DB_USER=<Your PostgreSQL Username>
DB_PASSWORD=<Your PostgreSQL Password>
```

- `GOOGLE_CREDENTIALS`: This should be your base64-encoded Google credentials JSON. You can generate Google API credentials from the [Google Cloud Console](https://console.cloud.google.com/).
- `GOOGLE_DRIVE_FOLDER_ID`: The ID of the folder in Google Drive where files will be stored.

### 4. Set Up the Database

1. Create a PostgreSQL database using your preferred method (e.g., using pgAdmin, a cloud provider, or the command line).
2. Import your database schema. The expected tables include:
   - `users`: For storing user details.
   - `tracks`: For storing track information.

### 5. Run the Server

Start the backend server with the following command:

```bash
npm start
```

The server should now be running at `http://localhost:4000`.

## 📚 API Endpoints

Here’s a list of the main endpoints provided by the backend:

### User Authentication
- **POST** `/login`: Authenticate a user with `user_name` and `user_password`.
- **GET** `/logout`: Destroy the user session and log out.

### User Management
- **GET** `/user/:id`: Retrieve user details by user ID.

### Track Management
- **GET** `/tracks/:id`: Get all tracks associated with a user.
- **POST** `/upload`: Upload an MP3 file to Google Drive and add it to the database.
- **PUT** `/updateTrack/:id`: Update the title and artist of a track.
- **DELETE** `/delete-file/:id`: Delete a track from both Google Drive and the database.

### File Proxy
- **GET** `/proxy`: Retrieve an uploaded file from Google Drive to be used within the app.

## 💾 Database Functions

This project utilizes PostgreSQL for managing data, with functions that handle:
- Retrieving user data
- Managing track information (creating, updating, and deleting)

## 🌐 Google Drive Integration

The project uses the Google Drive API to manage the uploaded MP3 files. When a user uploads a file, it is temporarily stored using `multer` and then uploaded to a Google Drive folder. 

The following functions interact with Google Drive:
- `findFolder`: Check if a specific folder exists.
- `createFolder`: Create a new folder if it doesn’t exist.
- `uploadFileToGoogleDrive`: Upload the MP3 file to Google Drive.
- `deleteFileFromGoogleDrive`: Remove the file from Google Drive.

## 🧑‍💻 How to Use

1. Start the backend server using `npm start`.
2. Use the connected React frontend to interact with the backend.
3. Upload, manage, and delete your MP3 files while they are stored on Google Drive and referenced in the PostgreSQL database.

## 📝 Environment Variables Summary

| Variable                  | Description                                  |
|---------------------------|----------------------------------------------|
| `PORT`                    | Port on which the server will run            |
| `BASE_URL`                | Base URL of your backend service             |
| `GOOGLE_DRIVE_FOLDER_ID`  | ID of your Google Drive folder               |
| `GOOGLE_CREDENTIALS`      | Base64 encoded Google Drive credentials      |
| `DB_HOST`                 | Host of your PostgreSQL database             |
| `DB_PORT`                 | Port of your PostgreSQL database (default: 5432) |
| `DB_DATABASE`             | Name of your PostgreSQL database             |
| `DB_USER`                 | Username for your PostgreSQL database        |
| `DB_PASSWORD`             | Password for your PostgreSQL database        |

## 💡 Future Improvements
- Implement user registration and email verification.
- Improve error handling and validation for uploaded files.
- Implement audio playback features in the React frontend.
- Enhance security features such as password hashing.

## 📜 License
This project is licensed under the MIT License.

## 🤝 Contributing
Contributions are welcome! Feel free to open an issue or submit a pull request.
