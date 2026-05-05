# Migration Scripts

## Analytics Data Migration

### Purpose
This script migrates analytics data from the stadium tracking database into the `newCampaignsGeneratedData` collection structure. It transforms raw analytics records into time-grouped data (hourly) with all necessary metrics.

### What it does
1. Connects to both main MongoDB and tracking MongoDB databases
2. Fetches all campaigns from the main database
3. For each campaign:
   - Retrieves analytics data from the tracking database (using `camera_id` = `deviceId`)
   - Groups data by hour
   - Calculates all metrics (unique contacts, RAC, frequencies, observation times, etc.)
   - Computes age groups and gender distributions
   - Generates visibility metrics
4. Saves the transformed data to `newCampaignsGeneratedData` collection with structure:
   ```
   {
     campaignId: ObjectId,
     generatedByData: "migration_script",
     lastProcessed: Date,
     mediaData: {
       "default": {
         "default": [
           {
             time: "2025-09-10T12:00:00+02:00",
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
             time: "...",
             total_human_ids: [...],
             unique_contacts_ids: [...],
             age_groups: {...},
             visibility: {...}
           },
           ...
         ]
       }
     }
   }
   ```

### Prerequisites
- Environment variables must be set:
  - `MONGODB_URI` - Main database connection string
  - `TRACKING_MONGODB_URI` - Tracking database connection string

### Running the Script

1. **Install dependencies** (if not already installed):
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Run the migration**:

   **For all campaigns:**
   ```bash
   npm run migrate:analytics
   # or
   yarn migrate:analytics
   ```

   **For a single campaign:**
   ```bash
   npm run migrate:single <campaignId>
   # or
   yarn migrate:single <campaignId>
   
   # Example:
   npm run migrate:single 68d2d4560b59b547766b08a8
   ```

3. **Monitor the output**:
   The script provides detailed progress information:
   - Connection status
   - Number of campaigns found (or campaign details for single migration)
   - For each campaign:
     - Number of analytics records found
     - Number of hourly data points created
     - Success/failure status
   - Final summary with success/error counts

### Data Structure

#### Media Code & Location
All data is stored under:
- **Media Code**: `"7eleven-1"`
- **Location ID**: `"68e6a45904f18f845546ddca"`

These values are configured in the migration scripts and can be updated if needed.

#### Metrics Calculated
- **total_humans**: Total unique people tracked in that hour
- **unique_contacts**: People who looked at the camera
- **average_frequency**: Average times each unique contact looked at camera
- **average_observation_time**: Average duration per observation (in seconds)
- **total_observation_time**: Total time people looked at camera (in seconds)
- **rac**: Realtime Accurate Contacts (total observation count)
- **visit_frequency**: Average visits per person
- **male_percentage**: Percentage of males (with gender randomization if >57%)
- **share_of_voice**: Default 100% for single campaign
- **vehicles**: Always 0 (not available in current data)

#### Age Groups
Calculated as percentages across 6 groups:
- 18-24
- 25-34
- 35-44
- 45-54
- 55-64
- 65+ (merged into 55-64)

#### Visibility Metrics
- **looked_at_screen_percentage**: % of humans who looked at camera
- **looked_away_percentage**: % who didn't look at camera
- **looked_left_percentage**: 0 (not available)
- **looked_right_percentage**: 0 (not available)
- **avarage_spent_in_zone**: Average time spent in zone per unique contact

### Notes
- Duration over 8 seconds is capped and randomized between 4-8 seconds
- Gender percentage is balanced if one gender exceeds 57%
- 65+ age group is merged into 55-64 group
- Script is idempotent - can be run multiple times safely (uses upsert)
- Existing data will be overwritten

### Troubleshooting

**Error: "MONGODB_URI environment variable is not set"**
- Ensure your `.env.local` file has both database connection strings

**Error: "No analytics data found"**
- Some campaigns may not have analytics data in the tracking database
- This is normal and the script will skip those campaigns

**Script runs but no data appears**
- Check that campaigns have valid `deviceId` values
- Verify the tracking database has analytics records with matching `camera_id`

