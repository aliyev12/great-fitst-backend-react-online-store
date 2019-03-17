const bcrypt = require ('bcryptjs');
jwt = require ('jsonwebtoken');
const {randomBytes} = require ('crypto');
const {promisify} = require ('util');

// This function will create/sign a JWT token, and it will attache a cookie with that token to response
const signCookie = (ctx, userId) => {
  // Generage the JWT token
  const token = jwt.sign ({userId}, process.env.APP_SECRET);
  // We set the JWT as a cookie on the response so every time that user clicks on another page, the token comes on the ride
  return ctx.response.cookie ('token', token, {
    // Make sure that its HTTP only so that a third party cannot get it with JavaScript, or some rogue browser extension etc.
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 10,
  });
};

const Mutations = {
  /*===================*/
  /*=== CREATE ITEM ===*/
  /*===================*/
  //   createItem(data: ItemCreateInput!): Item!
  async createItem (parent, args, ctx, info) {
    // TODO: Check if they are logged in

    const item = await ctx.db.mutation.createItem ({data: {...args}}, info);
    return item;
  },

  /*===================*/
  /*=== UPDATE ITEM ===*/
  /*===================*/
  //   updateItem(data: ItemUpdateInput!, where: ItemWhereUniqueInput!): Item
  updateItem (parent, args, ctx, info) {
    // First take a copy of the updates
    const updates = {...args};
    // Remove the ID from the updates
    delete updates.id;
    // Run the update method
    return ctx.db.mutation.updateItem (
      {
        data: updates,
        where: {
          id: args.id,
        },
      },
      info
    );
  },

  /*===================*/
  /*=== DELETE ITEM ===*/
  /*===================*/
  async deleteItem (parent, args, ctx, info) {
    const where = {id: args.id};
    // 1. Find the item
    const item = await ctx.db.query.item ({where}, `{id, title}`);
    // 2. Check if they own that item, or have the permissions
    // TODO
    // 3. Delete it!
    return ctx.db.mutation.deleteItem ({where}, info);
  },

  /*===================*/
  /*=== SIGN UP ===*/
  /*===================*/
  async signup (parent, args, ctx, info) {
    const {email, password, name} = args;
    if (!email || !password || !name)
      throw new Error ('Please, provide all the required information');
    // Lowercase user email
    args.email = args.email.toLowerCase ();
    // Hash user password and request salt with 10 characters
    const hashedPassword = await bcrypt.hash (args.password, 10);
    // Create user in the database
    const user = await ctx.db.mutation.createUser (
      {
        data: {
          ...args,
          password: hashedPassword,
          permissions: {set: ['USER']},
        },
      },
      info
    );
    // Generate JWT token and attach cookie to response
    signCookie (ctx, user.id);
    // Finally, we return the user to the browser
    return user;
  },

  /*===================*/
  /*=== SIGN IN ===*/
  /*===================*/
  async signin (parents, {email, password}, ctx, info) {
    // 1. Check if email and password are truthy
    if (!email || !password)
      throw new Error ('Please, provide all the required information');
    // 2. Check if there is a user with that email
    const user = await ctx.db.query.user ({where: {email: email}});
    if (!user) throw new Error (`No such user found for email ${email}`);
    // 3. Check if user password is corrent
    const valid = await bcrypt.compare (password, user.password);
    if (!valid) throw new Error ('Invalid Password');
    // Generate JWT token and attach cookie to response
    signCookie (ctx, user.id);
    // 6. Return the user
    return user;
  },

  /*===================*/
  /*=== SIGN OUT ===*/
  /*===================*/
  signout (parents, args, ctx, info) {
    ctx.response.clearCookie ('token');
    return {message: 'Goodbye!'};
  },

  /*===================*/
  /*=== REQUEST RESET ===*/
  /*===================*/
  async requestReset (parents, args, ctx, info) {
    // 1. Check if this is a real user
    const user = await ctx.db.query.user ({where: {email: args.email}});
    if (!user) throw new Error (`No such user found for email ${args.email}`);
    // 2. Set a reset token and expiry on that user
    // Create 20 randomBytes, make them into a promise in order to be able to use .then() instead of call back functions. Then translate that into a hex string
    const randomBytesPromiseified = promisify (randomBytes);
    const resetToken = (await randomBytesPromiseified (20)).toString ('hex');
    // Set 1 hour expiration for reset token
    const resetTokenExpiry = Date.now () + 3600000; // 1 hour from now
    // Update a user whose email matches whatever was received in the arguments to this call, and add two new entries to that user: resetToken and resetTokenExpiry
    const res = await ctx.db.mutation.updateUser ({
      where: {email: args.email},
      data: {resetToken, resetTokenExpiry},
    });
    delete res.password;
    console.log (res);
    // 3. Email them reset token
    return {message: 'Thanks!'};
  },

  /*===================*/
  /*=== RESET PASSWORD ===*/
  /*===================*/
  async resetPassword (parents, args, ctx, info) {
    // 1. Check if the passwords match
    if (args.password !== args.confirmPassword)
      throw new Error ('Passwords did not match.');
    // 2. Check if its a legit reset token

    // 3. Check if its expired
    // Destructure user from a users query
    const [user] = await ctx.db.query.users ({
      where: {
        // Search for user with matching resetToken
        resetToken: args.resetToken,
        // Check that the expiration of that token is still within one hour
        resetTokenExpiry_gte: Date.now () - 3600000, // --> expiration is more than one hour ago
      },
    });
    // If no user matches with the given token, then we throw an error
    if (!user) throw new Error ('This token is either invalid or expired.');
    // 4. Hash user's new password with 10 Salt digits using brcypt
    const password = await bcrypt.hash(args.password, 10);
    // 5. Save the new password to the user and remove old reset token fields
    const updatedUser = await ctx.db.mutation.updateUser({
        where: { email: user.email },
        data: {
            password,
            resetToken: null,
            resetTokenExpiry: null
        }
    });
    // 6. Generate JWT and set the JWT cookie
    signCookie(ctx, updatedUser.id);
    // 7. Return the new user
    return user;
  },
};

module.exports = Mutations;

/*
  When we create a user, we are setting a cookie with a currently logged in user.
  Every single time someone requests a page, the cookie is going to send
  along a JWT, and it will be kinda similar to sessions. It will send along
  a token that will allow to validate that the users are actually a user
  and to see who is logged in. We are using cookies with JWT instead of localStorage
  (every single time you have a request, you pull the jwt from localStorage and send it along for the ride,
    that way the backend can authenticate the current user before users can do anything like
    deleting or updating items). 
  The reason why we don't do this in localStorage and do it with cookies is because
  we are able to do server-side rendering of the logged in part. The downside to localStorage is that
  localStorage doesn't automatically send that token along. So there will be a slight delay before we pull the token and send it,
  and the first second or more the site will appear as if user is logged out. With cookies
  JWTs are sent automatically with every request so that we can immediately server render an authenticated user.
  */

/*
  Useless code, delete eventually...


      // // 4. Generage the JWT token
    // const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    // // 5. Set the cookie with token
    // ctx.response.cookie('token', token, {
    //     httpOnly: true,
    //     maxAge: 1000 * 60 * 60 * 24 * 10
    // });


        // const token = jwt.sign ({userId: user.id}, process.env.APP_SECRET);
    // // We set the JWT as a cookie on the response so every time that click on another page the token comes on the ride
    // ctx.response.cookie ('token', token, {
    //   // Make sure that its HTTP only so that a third party cannot get it with JavaScript, or some rogue browser extension etc.
    //   httpOnly: true,
    //   maxAge: 1000 * 60 * 60 * 24 * 10, // This will set timeout for 10 day. You can add * 365 for it to be a year
    // });
  */
