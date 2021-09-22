const User = require('./models/user');
const sheets = require('./modules/google/sheets');
// Initialize Database
require('./startup/db')();

async function popMemberId() {
  // memberId added after initial release, add if it doesn't exist
  const allMembers = await sheets.getAllMembers(false);
  const allUsers = await User.find({});

  allUsers.map(async user => {
    // Check if member making reservation exists
    const members = allMembers.filter(member => {
      member.primaryEmail.toLowerCase() === user.email.toLowerCase() ||
      member.secondaryEmail.toLowerCase() === user.email.toLowerCase()
    });
    
    if (members.length > 1) {
      const err = {
        message: "Multiple members with email exist",
        email: user.email
      }
    
      console.log(`Found multiple members with same email ${user.email}`)
    } else if (members.length === 0) {
      const err = {
        message: "User not found in member database",
        email: user.email
      }
    
      console.log(`Found no members with email matching user's ${user.email}`)
    } else {
      user.memberId = members[0].id;
      await user.save();

      console.log(`Saving updated member ID for user ${user.email}`)
    }
  })
}

popMemberId();