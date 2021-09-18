
const GoogleAPIScopes = {
  Calendar: {
    Scopes: {
      EventsRW: "https://www.googleapis.com/auth/calendar.events"
    }
  },
  Sheets: {
    Scopes: {
      SheetsR: 'https://www.googleapis.com/auth/spreadsheets.readonly'
    }
  },
  Schedule: {
    Types: {
      Lap: 'lap',
      Family: 'family',
      Lessons: 'lessons',
      Blocked: 'blocked'
    }
  }
}

module.exports.GoogleAPIScopes = GoogleAPIScopes;