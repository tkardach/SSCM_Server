const {GoogleAPIScopes} = require('./scopes');
const {google, networkmanagement_v1beta1} = require('googleapis');
const {generateJwtClient} = require('./general');
const {logError} = require('../../debug/logging');
const {uuidv4} = require('../../shared/utility');
const config = require('config');
const mcache = require('memory-cache');
const _ = require('lodash');


// Initialize constants
const SCOPES = [GoogleAPIScopes.Sheets.Scopes.SheetsR];


function checkEmpty(value) {
    return value === undefined || value === null || value === '';
}

//#region Members Methods

const MEMBER_INDICES = {
    LastName: 0,
    CertificateNumber: 1,
    Type: 2,
    Salutation: 3,
    Address: 4,
    Location: 5,
    Zip: 6,
    PrimaryPhone: 7,
    SecondaryPhone: 8,
    PrimaryEmail: 9,
    SecondaryEmail: 10,
    DirectorName: 11,
    DirectorEmail: 12,
    DirectorPhone: 13,
    FamilyMembers: 14,
    Notes: 15,
    NumberOfMembers: 16,
    OwesMoney: 17
}

const MEMBER_TYPES = {
    PermanentMember: 'PM',
    BoardMember: 'BD',
    ClubOwned: 'CO',
    LeasedMember: 'PL',
    SoldMember: 'SL',
    ClubOwnedLeasing: 'CL',
    ExtendedLease: 'EL',
    BoardExtendedLease: 'BE',
    NonPMLeasingPMMembership: 'LE'
}

const ACCEPTABLE_MEMBER_TYPES = [
    MEMBER_TYPES.BoardMember,
    MEMBER_TYPES.PermanentMember,
    MEMBER_TYPES.BoardExtendedLease,
    MEMBER_TYPES.NonPMLeasingPMMembership
]

function generateMember(sheetsMember) {
    return {
        id: sheetsMember[MEMBER_INDICES.CertificateNumber] + sheetsMember[MEMBER_INDICES.Type],
        lastName: sheetsMember[MEMBER_INDICES.LastName],
        certificateNumber: sheetsMember[MEMBER_INDICES.CertificateNumber],
        type: sheetsMember[MEMBER_INDICES.Type],
        salutation: sheetsMember[MEMBER_INDICES.Salutation],
        address: sheetsMember[MEMBER_INDICES.Address],
        location: sheetsMember[MEMBER_INDICES.Location],
        zip: sheetsMember[MEMBER_INDICES.Zip],
        primaryPhone: sheetsMember[MEMBER_INDICES.PrimaryPhone],
        secondaryPhone: sheetsMember[MEMBER_INDICES.SecondaryPhone],
        primaryEmail: sheetsMember[MEMBER_INDICES.PrimaryEmail] ? sheetsMember[MEMBER_INDICES.PrimaryEmail].toLowerCase().trim() : '',
        secondaryEmail: sheetsMember[MEMBER_INDICES.SecondaryEmail] ? sheetsMember[MEMBER_INDICES.SecondaryEmail].toLowerCase().trim() : '',
        directorName: sheetsMember[MEMBER_INDICES.DirectorName],
        directorEmail: sheetsMember[MEMBER_INDICES.DirectorEmail] ? sheetsMember[MEMBER_INDICES.DirectorEmail].toLowerCase().trim() : '',
        DirectorPhone: sheetsMember[MEMBER_INDICES.DirectorPhone],
        familyMembers: sheetsMember[MEMBER_INDICES.FamilyMembers],
        notes: sheetsMember[MEMBER_INDICES.Notes],
        numberOfMembers: sheetsMember[MEMBER_INDICES.NumberOfMembers]
    }
}

function convertMembers(sheetsMembers) {
    const members = [];

    sheetsMembers.forEach(mem => {
        const newMem = generateMember(mem);
        
        members.push(newMem);
    });

    return members;
}

function convertMembersLite(sheetsMembers) {
    const members = [];

    sheetsMembers.forEach(mem => {
        const newMem = {
            id: mem[MEMBER_INDICES.CertificateNumber] + mem[MEMBER_INDICES.Type],
            lastName: mem[MEMBER_INDICES.LastName],
            certificateNumber: mem[MEMBER_INDICES.CertificateNumber],
            type: mem[MEMBER_INDICES.Type]
        }

        members.push(newMem);
    });

    return members;
}

function convertMembersDict(sheetsMembers) {
    const members = {};

    sheetsMembers.forEach(mem => {
        const newMem = {
            id: mem[MEMBER_INDICES.CertificateNumber] + mem[MEMBER_INDICES.Type],
            lastName: mem[MEMBER_INDICES.LastName],
            certificateNumber: mem[MEMBER_INDICES.CertificateNumber],
            type: mem[MEMBER_INDICES.Type],
            salutation: mem[MEMBER_INDICES.Salutation],
            address: mem[MEMBER_INDICES.Address],
            location: mem[MEMBER_INDICES.Location],
            zip: mem[MEMBER_INDICES.Zip],
            primaryPhone: mem[MEMBER_INDICES.PrimaryPhone],
            secondaryPhone: mem[MEMBER_INDICES.SecondaryPhone],
            primaryEmail: mem[MEMBER_INDICES.PrimaryEmail] ? mem[MEMBER_INDICES.PrimaryEmail].toLowerCase().trim() : '',
            secondaryEmail: mem[MEMBER_INDICES.SecondaryEmail] ? mem[MEMBER_INDICES.SecondaryEmail].toLowerCase().trim() : '',
            directorName: mem[MEMBER_INDICES.DirectorName],
            directorEmail: mem[MEMBER_INDICES.DirectorEmail] ? mem[MEMBER_INDICES.DirectorEmail].toLowerCase().trim() : '',
            DirectorPhone: mem[MEMBER_INDICES.DirectorPhone],
            familyMembers: mem[MEMBER_INDICES.FamilyMembers],
            notes: mem[MEMBER_INDICES.Notes],
            numberOfMembers: mem[MEMBER_INDICES.NumberOfMembers]
        }

        members[newMem.id] = newMem;
    });

    return members;
}

function convertMembersLiteDict(sheetsMembers) {
    const members = {};

    sheetsMembers.forEach(mem => {
        const newMem = {
            id: mem[MEMBER_INDICES.CertificateNumber] + mem[MEMBER_INDICES.Type],
            lastName: mem[MEMBER_INDICES.LastName],
            certificateNumber: mem[MEMBER_INDICES.CertificateNumber],
            type: mem[MEMBER_INDICES.Type]
        }

        members[newMem.id] = newMem;
    });

    return members;
}

async function getAllSheetsMembers() {
    const key = '__express__' + 'getAllSheetsMembers';

    const cachedBody = mcache.get(key);

    if (cachedBody) 
      return cachedBody

    let jwtClient = await generateJwtClient(SCOPES);
    const sheets = google.sheets({version: 'v4', jwtClient});

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: config.get('sheetId'),
            range: 'Members!A2:S',
            key: config.get('sheetAPIKey'),
            quotaUser: uuidv4()
        });

        
        mcache.put(key, res.data.values, 300000);
        return res.data.values;
    } catch (err) {
        logError(err, `Failed to retrieve members from google sheet\n${err}`);
        return null;
    }
}

async function getAllMembers(lite) {
    const sheetsMembers = await sheets.getAllSheetsMembers();
    const accountsDict = await sheets.getAllAccountsDict();

    const members = lite ? convertMembersLite(sheetsMembers) : 
                            convertMembers(sheetsMembers);
    return members.filter(member => member.id in accountsDict);
}

async function getAllMembersDict(lite) {
    const sheetsMembers = await sheets.getAllSheetsMembers();
    const accountsDict = await sheets.getAllAccountsDict();

    const membersDict = lite ? convertMembersLiteDict(sheetsMembers) : 
                            convertMembersDict(sheetsMembers);

    return _.pickBy(membersDict, function(member, id) {
        return id in accountsDict;
    });
}

async function getAllPaidMembers(lite) {
    const members = await sheets.getAllMembers(lite);
    const accountsDict = await sheets.getAllAccountsDict();

    return members.filter(member => 
        accountsDict[member.id] && 
        accountsDict[member.id].eligibleToReserve === true);
}

async function getAllPaidMembersDict(lite) {
    const membersDict = await sheets.getAllMembersDict(lite);
    const accountsDict = await sheets.getAllAccountsDict();

    return _.pickBy(membersDict, function(member, id) {
        return accountsDict[id] && accountsDict[id].eligibleToReserve === true;
    });
}


//#endregion

//#region Accounts Methods

const ACCOUNT_INDICES = {
    CertificateNumber: 0,
    LastName: 1,
    Type: 2,
    MoneyOwed: 41,
    EligibleToReserve: 43
}

function generateAccount(sheetsAccount) {
    return {
        id: sheetsAccount[ACCOUNT_INDICES.CertificateNumber] + sheetsAccount[ACCOUNT_INDICES.Type],
        certificateNumber: sheetsAccount[ACCOUNT_INDICES.CertificateNumber],
        lastName: sheetsAccount[ACCOUNT_INDICES.LastName],
        type: sheetsAccount[ACCOUNT_INDICES.Type],
        moneyOwed: !checkEmpty(sheetsAccount[ACCOUNT_INDICES.MoneyOwed]),
        eligibleToReserve: !checkEmpty(sheetsAccount[ACCOUNT_INDICES.EligibleToReserve])
    }
}

function accountAcceptable(account) {
  return  account.lastName !== '' &&
          account.type !== '' &&
          account.certificateNumber !== '';
}

function convertAccounts(sheetsAccounts) {
    const accounts = [];
    sheetsAccounts.forEach(acc => {
        const newAccount = generateAccount(acc);
        if (accountAcceptable(newAccount))
            accounts.push(newAccount);
    });

    return accounts;
}

function convertAccountsDict(sheetsAccounts) {
    const accounts = {};
    sheetsAccounts.forEach(acc => {
        const newAccount = generateAccount(acc);
        if (accountAcceptable(newAccount))
            accounts[newAccount.id] = newAccount;
    });

    return accounts;
}

function convertAccountsLite(sheetsAccounts) {
    const accounts = [];
    sheetsAccounts.forEach(acc => {
        if (accountAcceptable(acc)) {
          const newAccount = {
              id: acc[ACCOUNT_INDICES.CertificateNumber] + acc[ACCOUNT_INDICES.Type],
              moneyOwed: !checkEmpty(acc[ACCOUNT_INDICES.MoneyOwed]),
              eligibleToReserve: !checkEmpty(acc[ACCOUNT_INDICES.EligibleToReserve])
          }
  
          accounts.push(newAccount);
        }
    });

    return accounts;
}

function convertAccountsDictLite(sheetsAccounts) {
    const accounts = {};
    sheetsAccounts.forEach(acc => {
      if (accountAcceptable(acc)) {
        const newAccount = {
            id: acc[ACCOUNT_INDICES.CertificateNumber] + acc[ACCOUNT_INDICES.Type],
            moneyOwed: !checkEmpty(acc[ACCOUNT_INDICES.MoneyOwed]),
            eligibleToReserve: !checkEmpty(acc[ACCOUNT_INDICES.EligibleToReserve])
        }

        if (accountAcceptable(newAccount))
            accounts[newAccount.id] = newAccount;
      }
    });

    return accounts;
}

async function getAllSheetsAccounts() {
    const key = '__express__' + 'getAllSheetsAccounts';

    const cachedBody = mcache.get(key);

    if (cachedBody) 
      return cachedBody

    let jwtClient = await generateJwtClient(SCOPES);
    const sheets = google.sheets({version: 'v4', jwtClient});

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: config.get('sheetId'),
            range: 'Accounts!A4:AR',
            key: config.get('sheetAPIKey'),
            quotaUser: uuidv4()
        });

        mcache.put(key, res.data.values, 3600000);
        return res.data.values;
    } catch (err) {
        logError(err, `Failed to retrieve members from google sheet\n${err}`);
        return null;
    }
}

async function getAllAccounts(lite) {
    return lite ? convertAccountsLite(await sheets.getAllSheetsAccounts()) :
                  convertAccounts(await sheets.getAllSheetsAccounts());
}

async function getAllAccountsDict(lite) {
    return lite ? convertAccountsDictLite(await sheets.getAllSheetsAccounts()) :
                  convertAccountsDict(await sheets.getAllSheetsAccounts());
}

//#endregion

//#region Over-Due Methods

const OVERDUE_INDICES = {
  MemberNumber: 2,
  TotalOwed: 4,
  StartUpFee: 5,
  EquityShare: 6,
  UnpaidCarryOver: 7,
  MembershipDues: 8,
  LateFee: 9,
  WorkDayFee: 10,
  GuestFee: 11,
  NannyFee: 12,
  AssessmentFee: 13,
  MembershipType: 17
}

function generateFees(sheetsOverdue) {
  return {
      certificateNumber: sheetsOverdue[OVERDUE_INDICES.MemberNumber],
      id: sheetsOverdue[OVERDUE_INDICES.MemberNumber] + sheetsOverdue[OVERDUE_INDICES.MembershipType],
      totalOwed: sheetsOverdue[OVERDUE_INDICES.TotalOwed],
      dues: [
        {name: "Membership Dues", amount: sheetsOverdue[OVERDUE_INDICES.MembershipDues]},
        {name: "Unpaid Carryover", amount: sheetsOverdue[OVERDUE_INDICES.UnpaidCarryOver]},
        {name: "Startup Fee", amount: sheetsOverdue[OVERDUE_INDICES.StartUpFee]},
        {name: "Late Fee", amount: sheetsOverdue[OVERDUE_INDICES.LateFee]},
        {name: "Nanny Fee", amount: sheetsOverdue[OVERDUE_INDICES.NannyFee]},
        {name: "Guest Fee", amount: sheetsOverdue[OVERDUE_INDICES.GuestFee]},
        {name: "Workday Fee", amount: sheetsOverdue[OVERDUE_INDICES.WorkDayFee]},
        {name: "Assessment Fee", amount: sheetsOverdue[OVERDUE_INDICES.AssessmentFee]},
        {name: "Equity Share", amount: sheetsOverdue[OVERDUE_INDICES.EquityShare]}
      ]
  }
}


function overdueAcceptable(fees) {
  return  fees.lastName !== '' &&
          isNaN(fees.lastName) &&
          !isNaN(fees.certificateNumber);
}

function convertOverdue(sheetsOverdue) {
  const fees = [];
  sheetsOverdue.forEach(fee => {
      const newFees = generateFees(fee);
      if (overdueAcceptable(newFees))
          fees.push(newFees);
  });

  return fees;
}

function convertOverdueDict(sheetsOverdue) {
  const fees = {};
  sheetsOverdue.forEach(fee => {
      const newFees = generateFees(fee);
      if (overdueAcceptable(newFees))
          fees[newFees.id] = newFees;
  });

  return fees;
}

async function getAllSheetsOverdue() {
  const key = '__express__' + 'getAllSheetsOverdue';

  const cachedBody = mcache.get(key);

  if (cachedBody) 
    return cachedBody

  let jwtClient = await generateJwtClient(SCOPES);
  const sheets = google.sheets({version: 'v4', jwtClient});

  try {
      const res = await sheets.spreadsheets.values.get({
          spreadsheetId: config.get('sheetId'),
          range: 'Over-Due!A4:R',
          key: config.get('sheetAPIKey'),
          quotaUser: uuidv4()
      });

      mcache.put(key, res.data.values, 60000);
      return res.data.values;
  } catch (err) {
      logError(err, `Failed to retrieve overdue from google sheet\n${err}`);
      return null;
  }
}

async function getAllOverdue() {
  return convertOverdue(await sheets.getAllSheetsOverdue());
}

async function getAllOverdueDict() {
  return convertOverdueDict(await sheets.getAllSheetsOverdue());
}

//#endregion

//#region Signin Methods

const SIGNIN_INDICES = {
  Timestamp: 0,
  LastName: 1,
  CertificateNumber: 2,
  NumberOfMembers: 3,
  NumberOfGuests: 4,
  DropOffKids: 5,
  FamilyMembers: 6,
  Type: 7,
  PrimaryPhone: 8,
  PrimaryEmail: 9,
  SecondaryPhone: 10,
  SecondaryEmail: 11
}


function generateSignin(sheetsSignin) {
  return {
    id: sheetsSignin[SIGNIN_INDICES.CertificateNumber] + sheetsSignin[SIGNIN_INDICES.Type],
    ts: new Date(sheetsSignin[SIGNIN_INDICES.Timestamp]),
    lastName: sheetsSignin[SIGNIN_INDICES.LastName],
    type: sheetsSignin[SIGNIN_INDICES.Type],
    droppedOffKids: sheetsSignin[SIGNIN_INDICES.DropOffKids],
    familyMembers: sheetsSignin[SIGNIN_INDICES.FamilyMembers],
    numberOfMembers: sheetsSignin[SIGNIN_INDICES.NumberOfMembers],
    numberOfGuests: sheetsSignin[SIGNIN_INDICES.NumberOfGuests],
    primaryPhone: sheetsSignin[SIGNIN_INDICES.PrimaryPhone],
    secondaryPhone: sheetsSignin[SIGNIN_INDICES.SecondaryPhone],
    primaryEmail: sheetsSignin[SIGNIN_INDICES.PrimaryEmail] ? sheetsSignin[SIGNIN_INDICES.PrimaryEmail].toLowerCase().trim() : '',
    secondaryEmail: sheetsSignin[SIGNIN_INDICES.SecondaryEmail] ? sheetsSignin[SIGNIN_INDICES.SecondaryEmail].toLowerCase().trim() : '',
  }
}

function convertSignins(sheetsSignins) {
  const signins = [];

  sheetsSignins.forEach(si => {
      const newSignin = generateSignin(si);
      
      signins.push(newSignin);
  });

  return signins;
}

function convertSigninsLite(sheetsSignins) {
  const signins = [];

  sheetsSignins.forEach(si => {
      const newSignin = {
          id: si[SIGNIN_INDICES.CertificateNumber] + si[SIGNIN_INDICES.Type],
          ts: new Date(si[SIGNIN_INDICES.Timestamp]),
          numberOfMembers: si[SIGNIN_INDICES.NumberOfMembers],
          numberOfGuests: si[SIGNIN_INDICES.NumberOfGuests],
          droppedOffKids: si[SIGNIN_INDICES.DropOffKids]
      }

      signins.push(newSignin);
  });

  return signins;
}

function convertSigninsLiteDict(sheetsSignins) {
  const signins = {};

  sheetsSignins.forEach(si => {
      const newSignin = {
        id: si[SIGNIN_INDICES.CertificateNumber] + si[SIGNIN_INDICES.Type],
        ts: new Date(si[SIGNIN_INDICES.Timestamp]),
        numberOfMembers: si[SIGNIN_INDICES.NumberOfMembers],
        numberOfGuests: si[SIGNIN_INDICES.NumberOfGuests],
        droppedOffKids: si[SIGNIN_INDICES.DropOffKids]
      }

      signins[newSignin.id] = newSignin;
  });

  return signins;
}

function convertSigninsDict(sheetsSignins) {
  const signins = {};

  sheetsSignins.forEach(si => {
      const newSignin = {
        id: si[SIGNIN_INDICES.CertificateNumber] + si[SIGNIN_INDICES.Type],
        ts: new Date(si[SIGNIN_INDICES.Timestamp]),
        lastName: si[SIGNIN_INDICES.LastName],
        type: si[SIGNIN_INDICES.Type],
        droppedOffKids: si[SIGNIN_INDICES.DropOffKids],
        familyMembers: si[SIGNIN_INDICES.FamilyMembers],
        numberOfMembers: si[SIGNIN_INDICES.NumberOfMembers],
        numberOfGuests: si[SIGNIN_INDICES.NumberOfGuests],
        primaryPhone: si[SIGNIN_INDICES.PrimaryPhone],
        secondaryPhone: si[SIGNIN_INDICES.SecondaryPhone],
        primaryEmail: si[SIGNIN_INDICES.PrimaryEmail] ? si[SIGNIN_INDICES.PrimaryEmail].toLowerCase().trim() : '',
        secondaryEmail: si[SIGNIN_INDICES.SecondaryEmail] ? si[SIGNIN_INDICES.SecondaryEmail].toLowerCase().trim() : '',
      }

      signins[newSignin.id] = newSignin;
  });

  return signins;
}

async function getAllSheetsSignins() {
  const key = '__express__' + 'getAllSheetsSignins';

  const cachedBody = mcache.get(key);

  if (cachedBody) 
    return cachedBody

  let jwtClient = await generateJwtClient(SCOPES);
  const sheets = google.sheets({version: 'v4', jwtClient});

  try {
      const res = await sheets.spreadsheets.values.get({
          spreadsheetId: config.get('sheetId'),
          range: 'SignIn!A2:M',
          key: config.get('sheetAPIKey'),
          quotaUser: uuidv4()
      });

      mcache.put(key, res.data.values, 86400000);
      return res.data.values;
  } catch (err) {
      logError(err, `Failed to retrieve signins from google sheet\n${err}`);
      return null;
  }
}

async function getAllSignins(lite) {
  const sheetsSignins = await sheets.getAllSheetsSignins();

  return lite ? convertSigninsLite(sheetsSignins) : 
                convertSignins(sheetsSignins);
}

async function getAllSigninsDict(lite) {
  const sheetsSignins = await sheets.getAllSheetsSignins();

  return lite ? convertSigninsLiteDict(sheetsSignins) : 
                convertSigninsDict(sheetsSignins);
}

//#endregion

const sheets = {
    getAllSheetsSignins,
    getAllSignins,
    getAllSigninsDict,
    getAllSheetsMembers,
    getAllMembers,
    getAllMembersDict,
    getAllPaidMembers,
    getAllPaidMembersDict,
    getAllSheetsAccounts,
    getAllAccounts,
    getAllAccountsDict,
    getAllSheetsOverdue,
    getAllOverdue,
    getAllOverdueDict,
    ACCOUNT_INDICES,
    MEMBER_INDICES,
    OVERDUE_INDICES,
    SIGNIN_INDICES
};

module.exports = sheets;
