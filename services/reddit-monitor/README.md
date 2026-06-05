# DNounce Reddit Monitor

## Setup
1. Copy `.env.example` to `.env` and fill in all values
2. Install dependencies: `pip install -r requirements.txt`
3. Test run: `python monitor.py`

## Reddit App Setup
1. Go to https://www.reddit.com/prefs/apps
2. Create a "script" type app
3. Copy client_id and client_secret to .env

## Groq Setup
1. Get free API key at https://console.groq.com
2. Add to .env as GROQ_API_KEY

## Running Daily (Mac)
Add to crontab (`crontab -e`):
`0 8 * * * cd ~/Desktop/dnounce/services/reddit-monitor && python monitor.py >> logs/monitor.log 2>&1`

## Environment Variables
See .env.example for all required variables
