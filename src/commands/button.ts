import { Database } from '@cloudflare/d1';
import { CommandContext, SlashCreator } from 'slash-create';
import { SlashCommand, ComponentType, ButtonStyle, CommandOptionType } from 'slash-create';

// D1 bindings are not supported for service workers yet.
// declare const db: Database;
declare const db_binding: any; // DatabaseBinding
const db = new Database(db_binding);

module.exports = class ButtonCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
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
          description: 'The text on the button.',
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
          type: CommandOptionType.CHANNEL
        },
        {
          name: 'welcome_text',
          description: 'The text to send the user in the welcome_channel, if approved.',
          type: CommandOptionType.STRING
        }
      ]
    });
  }

  async run(ctx: CommandContext) {
    await ctx.defer();

    await db
      .prepare(
        'INSERT INTO options (id, title, description, role_id, mod_channel, button_text, welcome_channel, welcome_text) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)'
      )
      .bind(
        ctx.data.id,
        ctx.options['title'],
        ctx.options['description'],
        ctx.options['role'],
        ctx.options['mod_channel'],
        ctx.options['button_text'],
        ctx.options['welcome_channel'],
        ctx.options['welcome_text']
      )
      .run();

    // Question ID is [optionsId]-[questionNumber]
    await db
      .prepare('INSERT INTO questions (id, options_id, title, type) VALUES (?1, ?2, ?3, ?4)')
      .bind(`${ctx.data.id}-1`, ctx.data.id, ctx.options['question1_title'], ctx.options['question1_type'])
      .run();

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
              custom_id: `options-${ctx.data.id}`
            }
          ]
        }
      ]
    });
  }
};
