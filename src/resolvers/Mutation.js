const Mutations = {
    //   createItem(data: ItemCreateInput!): Item!
  async createItem (parent, args, ctx, info) {
    // TODO: Check if they are logged in

    const item = await ctx.db.mutation.createItem (
      {
        data: {
          ...args,
        },
      },
      info
    );

    return item;
  },
    //   updateItem(data: ItemUpdateInput!, where: ItemWhereUniqueInput!): Item
  updateItem(parent, args, ctx, info) {
    // First take a copy of the updates
    const updates = { ...args };
    // Remove the ID from the updates
    delete updates.id;
    // Run the update method
    return ctx.db.mutation.updateItem({
        data: updates,
        where: {
            id: args.id
        }
    }, info);
  }
};

module.exports = Mutations;
