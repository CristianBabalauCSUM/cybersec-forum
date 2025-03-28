# Next.js Application Setup Guide

## Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- MongoDB Atlas account

## Project Setup

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd <project-directory>
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration

#### Create `.env` file in the project root
```
DATABASE_URL="mongodb+srv://dbUser:dbUserPassword@cluster0.oxtobre.mongodb.net/COMPSEC_DB?retryWrites=true&w=majority&appName=Cluster0"
```

#### Create `.env.local` file in the project root
```
AUTH_SECRET="UnB97SMGRfemDXJoWr7NT8lMWf7MuXGq186bCCJm4zM="
```

### 4. Database Setup
#### Initialize Prisma
```bash
npx prisma generate
npx prisma db push
```

### 5. Run Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure
- `prisma/`: Database schema
- `app/`: Next.js application routes
- `lib/`: Utility and configuration files
- `components/`: Reusable React components

## Common Commands
- `npm run dev`: Start development server
- `npm run build`: Create production build
- `npm start`: Run production build
- `npx prisma studio`: Open database management interface

## Troubleshooting
- Ensure all environment variables are correctly set
- Verify MongoDB connection string
- Check Node.js version compatibility

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License
[Your License Here]
```

## Additional Notes
- Replace `<your-repository-url>` with the actual repository URL
- Add your specific license information
- Customize the README according to your project's specific requirements