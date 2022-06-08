const { SlashCommand, ComponentType, ButtonStyle, CommandOptionType, TextInputStyle } = require('slash-create');

module.exports = class ButtonCommand extends SlashCommand {
  constructor(creator) {
    super(creator, {
      name: 'button',
      description: 'Show some buttons.',
      defaultPermission: false,
      requiredPermissions: ['MANAGE_ROLES', 'MANAGE_MESSAGES'],
      options: [
        {
          name: 'title',
          description: 'The title for the embed to send.',
          type: CommandOptionType.STRING,
          required: true
        },
        {
          name: 'description',
          description: 'The description for the embed to send.',
          type: CommandOptionType.STRING,
          required: true
        },
        {
          name: 'role',
          description: 'The role that will be given to successful applicants.',
          type: CommandOptionType.ROLE,
          required: true
        },
        {
          name: 'mod_channel',
          description: 'The text channel to send the applications to, for moderator review.',
          type: CommandOptionType.CHANNEL,
          required: true
        },
        {
          name: 'button_text',
          description: "The text on the button.",
          type: CommandOptionType.STRING,
          required: true
        },
        {
          name: 'question1_title',
          description: 'The title for question 1',
          type: CommandOptionType.STRING,
          required: true
        },
        {
          name: 'question1_type',
          description: 'The type of input field to use for question 1',
          type: CommandOptionType.STRING,
          choices: [
            {
              name: 'Paragraph',
              value: 'PARAGRAPH'
            },
            {
              name: 'Short text field',
              value: 'SHORT'
            }
          ],
          required: true
        },
        {
          name: 'welcome_channel',
          description: 'The channel to welcome the user in, if approved',
          type: CommandOptionType.STRING
        },
        {
          name: 'welcome_text',
          description: 'The text to send the user in the welcome_channel, if approved.',
          type: CommandOptionType.STRING
        }
      ]
    });
  }

  async run(ctx) {

    await kv.put(ctx.data.id, JSON.stringify({
      type: 'OPTIONS',
      data: ctx.options
    }))

    await ctx.defer();
    await ctx.send('', {
      embeds: [
        {
          title: ctx.options.title,
          description: ctx.options.description
        }
      ],
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.PRIMARY,
              label: ctx.options.button_text,
              custom_id: ctx.data.id,
            }
          ]
        }
      ]
    });
  }
};
