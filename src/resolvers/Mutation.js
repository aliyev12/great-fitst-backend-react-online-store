const bcrypt = require('bcryptjs');

const Mutations = {
  //   createItem(data: ItemCreateInput!): Item!
  async createItem (parent, args, ctx, info) {
    // TODO: Check if they are logged in

    const item = await ctx.db.mutation.createItem ({data: {...args}}, info);
    return item;
  },
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
  async deleteItem (parent, args, ctx, info) {
    const where = {id: args.id};
    // 1. Find the item
    const item = await ctx.db.query.item ({where}, `{id, title}`);
    // 2. Check if they own that item, or have the permissions
    // TODO
    // 3. Delete it!
    return ctx.db.mutation.deleteItem ({where}, info);
  },
  async signup(parent, args, ctx, info) {
      // Lowercase user email
      args.email = args.email.toLowerCase();
      // Hash user password and request salt with 10 characters
    const password = await bcrypt.hash(args.password, 10);
    // Create user in the database
    const user = await ctx.db.mutation.createUser({
        data: {
            ...args,
            password,
            permissions: { set: ['USER'] }
        }
    }, info);
  } 
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