# Quick Start Guide - Analytics Migration

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Add to `.env.local`:
```env
MONGODB_URI=mongodb://your-main-database-connection
TRACKING_MONGODB_URI=mongodb://your-tracking-database-connection
```

### 3. Test with One Campaign
```bash
npm run migrate:single YOUR_CAMPAIGN_ID
```

### 4. Run Full Migration
```bash
npm run migrate:analytics
```

## 📋 Commands

| Command | Description |
|---------|-------------|
| `npm run migrate:analytics` | Migrate ALL campaigns |
| `npm run migrate:single <id>` | Migrate ONE campaign |

## ✅ What Gets Created

```
newCampaignsGeneratedData
└── {
      campaignId: ObjectId,
      lastProcessed: Date,
      mediaData: {
        "7eleven-1": {
          "68e6a45904f18f845546ddca": [
            { time, total_humans, unique_contacts, rac, ... }
          ]
        }
      }
    }
```

## 📊 Metrics Generated

- ✅ Total Humans
- ✅ Unique Contacts  
- ✅ RAC (Realtime Accurate Contacts)
- ✅ Average Frequency
- ✅ Visit Frequency
- ✅ Observation Times
- ✅ Male/Female %
- ✅ Age Groups (6 ranges)
- ✅ Visibility Metrics

## ⚡ Tips

- **Safe to re-run** - Uses upsert, won't duplicate
- **Media code**: "7eleven-1"
- **Location**: "68e6a45904f18f845546ddca"
- **Grouping**: By hour
- **Timezone**: +02:00

## 📚 Full Documentation

- **README.md** - Complete guide
- **ENV_SETUP.md** - Environment setup
- **MIGRATION_SUMMARY.md** - Detailed overview

## 🆘 Troubleshooting

**No data for campaign?**
- Normal - not all campaigns have analytics data

**Connection error?**
- Check `.env.local` variables
- Verify database access

**TypeScript error?**
- Run `npm install` to get tsx

---

**Ready to migrate?** Start with `npm run migrate:single <campaignId>` to test!

