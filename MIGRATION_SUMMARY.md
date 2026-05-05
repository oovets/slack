# Analytics Data Migration - Summary

## What Has Been Created

I've created a complete migration solution to transform analytics data from the stadium tracking database into the `newCampaignsGeneratedData` structure.

### Files Created

#### 1. **scripts/migrate-analytics-to-generated-data.ts**
Main migration script that processes ALL campaigns in the database.

**Features:**
- Connects to both main and tracking databases
- Fetches all campaigns
- Transforms analytics data into hourly grouped metrics
- Saves to `newCampaignsGeneratedData` collection
- Comprehensive progress logging
- Error handling for individual campaigns

**Run with:**
```bash
npm run migrate:analytics
```

#### 2. **scripts/migrate-single-campaign.ts**
Single campaign migration script for testing or selective migration.

**Features:**
- Migrates one specific campaign by ID
- Shows sample data preview
- Detailed output for debugging
- Perfect for testing before full migration

**Run with:**
```bash
npm run migrate:single <campaignId>
# Example:
npm run migrate:single 68d2d4560b59b547766b08a8
```

#### 3. **scripts/README.md**
Comprehensive documentation including:
- Purpose and overview
- Data structure explanation
- Running instructions
- Troubleshooting guide
- Metrics details

#### 4. **scripts/ENV_SETUP.md**
Environment variable setup guide:
- Required variables
- Setup instructions
- Example configurations
- Verification steps

### Package.json Updates

Added two new scripts:
```json
{
  "scripts": {
    "migrate:analytics": "tsx scripts/migrate-analytics-to-generated-data.ts",
    "migrate:single": "tsx scripts/migrate-single-campaign.ts"
  }
}
```

Added `tsx` as dev dependency for running TypeScript files directly.

## Data Structure

The migration creates documents in `newCampaignsGeneratedData` with this structure:

```typescript
{
  _id: ObjectId,
  campaignId: ObjectId,
  generatedByData: "migration_script",
  lastProcessed: Date,
  mediaData: {
    "7eleven-1": {  // Media code
      "68e6a45904f18f845546ddca": [  // Location ID
        {
          time: "2025-09-10T12:00:00+02:00",  // Hourly timestamp
          total_humans: 46,
          unique_contacts: 22,
          average_frequency: 2.51,
          average_observation_time: 1.77,
          total_observation_time: 39,
          rac: 55,
          vehicles: 0,
          visit_frequency: 5.05,
          male_percentage: 70,
          share_of_voice: 100,
          duration_seconds: 3600,
          total_human_ids: ["15301", "43038", ...],
          unique_contacts_ids: ["15301", "43038", ...],
          age_groups: {
            "18-24": 15.5,
            "25-34": 23.2,
            "35-44": 18.7,
            "45-54": 22.1,
            "55-64": 20.5,
            "65+": 0
          },
          visibility: {
            looked_at_screen_percentage: 47.83,
            looked_left_percentage: 0,
            looked_right_percentage: 0,
            looked_away_percentage: 52.17,
            avarage_spent_in_zone: 1.77
          }
        },
        // ... more hourly entries
      ]
    }
  }
}
```

## Metrics Calculated

From raw analytics records, the script calculates:

### Core Metrics
- **total_humans**: Unique people tracked in that hour
- **unique_contacts**: People who looked at camera
- **average_frequency**: Avg times each contact looked at camera
- **rac**: Total observation count (Realtime Accurate Contacts)
- **visit_frequency**: Average visits per person
- **average_observation_time**: Avg duration per observation (seconds)
- **total_observation_time**: Total time people looked at camera (seconds)

### Demographics
- **male_percentage**: % of males (with smart balancing)
- **age_groups**: Distribution across 6 age ranges (as percentages)

### Visibility
- **looked_at_screen_percentage**: % who looked at camera
- **looked_away_percentage**: % who didn't look
- **avarage_spent_in_zone**: Avg time in zone per contact

### Special Logic
- Duration capped at 8 seconds (randomized 4-8 if exceeded)
- Gender percentage balanced if one exceeds 57%
- 65+ age group merged into 55-64
- Share of voice defaults to 100% (single campaign)

## How to Use

### First Time Setup

1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Set up environment variables** (see `scripts/ENV_SETUP.md`):
   ```env
   MONGODB_URI=your-main-database-connection
   TRACKING_MONGODB_URI=your-tracking-database-connection
   ```

### Running Migrations

#### Test with Single Campaign
```bash
# Find a campaign ID first, then:
npm run migrate:single 68d2d4560b59b547766b08a8
```

Review the output to ensure data looks correct.

#### Migrate All Campaigns
```bash
npm run migrate:analytics
```

This will process all campaigns and show progress.

### What the Script Does

For each campaign:
1. ✅ Fetches campaign details from main database
2. ✅ Retrieves analytics data from tracking database using `camera_id` = `deviceId`
3. ✅ Groups data by hour
4. ✅ Calculates all metrics for each hour
5. ✅ Saves to `newCampaignsGeneratedData` collection
6. ✅ Logs progress and results

### Safe to Re-run
- Scripts use `upsert` - safe to run multiple times
- Existing data will be updated with latest calculations
- No duplicate records created

## Integration with Existing Code

The generated data structure matches the format expected by your `combineDataByTimeframe` function from your other project. The data can be:

1. **Queried by timeframe** - already in hourly format
2. **Filtered by media code** - currently "default"
3. **Filtered by location** - currently "default"
4. **Combined across time periods** - using your existing logic

### Current Configuration

The migration scripts are configured with:

```typescript
mediaData: {
  "7eleven-1": {  // Media code
    "68e6a45904f18f845546ddca": [ // Location ID
      // ... data
    ]
  }
}
```

To use different values, update these in the migration scripts before running.

## Troubleshooting

### No Analytics Data
Some campaigns may not have analytics data:
```
⚠️  No analytics data found for campaign XYZ
```
This is normal - script skips these campaigns.

### Connection Errors
Check:
- Environment variables are set correctly
- Database URLs are accessible
- Network/firewall allows connections
- Credentials are valid

### TypeScript Errors
Ensure `tsx` is installed:
```bash
npm install --save-dev tsx
```

## Next Steps

1. ✅ Review `scripts/README.md` for detailed documentation
2. ✅ Set up environment variables (see `scripts/ENV_SETUP.md`)
3. ✅ Test with single campaign migration
4. ✅ Run full migration for all campaigns
5. ✅ Update media codes/locations as needed
6. ✅ Integrate with your existing dashboard code

## Notes

- Media code: `"7eleven-1"`
- Location ID: `"68e6a45904f18f845546ddca"`
- Time format: ISO 8601 with +02:00 timezone
- Hourly grouping: Data grouped by hour
- Upsert mode: Safe to re-run scripts

---

**Questions or Issues?**
Refer to `scripts/README.md` for comprehensive documentation.

