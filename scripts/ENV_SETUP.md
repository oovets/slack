# Environment Variables Setup

## Required Environment Variables for Migration Scripts

The migration scripts require the following environment variables to be set in your `.env.local` file:

### Main Database Connection
```env
MONGODB_URI=mongodb://localhost:27017/your-database-name
```
This is the primary database connection for:
- Campaigns collection
- Campaign styles
- newCampaignsGeneratedData collection (where migrated data will be saved)

### Tracking Database Connection
```env
TRACKING_MONGODB_URI=mongodb://localhost:27017/stadium
```
This is the tracking database connection that contains:
- Analytics collection with raw tracking data
- Used by the migration scripts to fetch analytics data

### Optional Variables
```env
# NextAuth (if using authentication)
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# MongoDB Database Name (optional, if not in connection string)
MONGODB_DB_NAME=your-database-name
```

## Setup Instructions

1. Create a `.env.local` file in the root of your project (if it doesn't exist)
2. Add the required environment variables listed above
3. Update the connection strings with your actual MongoDB credentials
4. Ensure both databases are accessible from your development environment

## Example .env.local

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/metrics-dashboard
TRACKING_MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/stadium
NEXTAUTH_SECRET=generated-secret-key-abc123
NEXTAUTH_URL=http://localhost:3000
```

## Verifying Setup

To verify your environment variables are correctly set:

```bash
# Check if tsx is installed
npx tsx --version

# Try running the migration script
npm run migrate:analytics
```

If you see connection errors, double-check:
- Database URLs are correct
- Network access is allowed from your IP
- Database credentials are valid
- Database names exist

