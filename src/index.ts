import { ComponentType, ModalOptions, TextInputStyle } from 'slash-create';
import { commands } from './commands';
import { SlashCreator, CFWorkerServer } from './shim';
import { Database } from '@cloudflare/d1';

/* Workaround for https://discord.com/channels/595317990191398933/992060581832032316/1000527432274677770 */
export type Results<Type> = {
  results: Type[];
};

export function hasResults<Type>(data: any): data is Results<Type> {
  return data.results !== undefined && data.results.length > 0;
}

export const creator = new SlashCreator({
  applicationID: DISCORD_APP_ID,
  publicKey: DISCORD_PUBLIC_KEY,
  token: DISCORD_BOT_TOKEN
});

// D1 bindings are not supported for service workers yet.
// declare const db: Database;
declare const db_binding: any; // DatabaseBinding
const db = new Database(db_binding);

creator.withServer(new CFWorkerServer()).registerCommands(commands);

creator.on('warn', (message) => console.warn(message));
creator.on('error', (error) => console.error(error.stack || error.toString()));
creator.on('commandRun', (command, _, ctx) =>
  console.info(`${ctx.user.username}#${ctx.user.discriminator} (${ctx.user.id}) ran command ${command.commandName}`)
);
creator.on('commandError', (command, error) =>
  console.error(`Command ${command.commandName} errored:`, error.stack || error.toString())
);

creator.on('modalInteraction', async (ctx) => {
  const options: any = await db.prepare('SELECT * FROM options WHERE id = ?').bind(ctx.customID).first();

  await db
    .prepare('INSERT INTO applications (id, user_id, role_id, options_id) VALUES (?1, ?2, ?3, ?4)')
    .bind(ctx.data.id, ctx.user.id, options.role_id, options.id)
    .run();

  console.log(ctx.data.id);

  console.log(options.id);
  const question: any = await db
    .prepare('SELECT id, title FROM questions WHERE options_id = ?')
    .bind(options.id)
    .first();

  console.log(question);

  await db
    .prepare('INSERT INTO answers (question_id, application_id, text) VALUES (?1, ?2, ?3)')
    .bind(question.id, ctx.data.id, ctx.values[question.id])
    .run();

  await creator.requestHandler.request('POST', `/channels/${options.mod_channel}/messages`, true, {
    content: `New application for <@&${options.role_id}> submitted by <@${ctx.user.id}>!`,
    allowed_mentions: {
      parse: []
    },
    embeds: [
      {
        title: question.title,
        description: ctx.values[question.id],
        footer: {
          text: `Application ID: ${ctx.data.id}`
        }
      }
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: 'Approve',
            custom_id: `application-${ctx.data.id}`
          }
        ]
      }
    ]
  });

  ctx.send('Your application has been submitted.', { ephemeral: true });
});

creator.on('componentInteraction', async (ctx) => {
  // we kept all the state in D1 because it lets us store more.
  // the custom ID is the type of data and the key to tell us where the state is

  if (ctx.customID.startsWith('options-')) {
    const optionsId = ctx.customID.substring('options-'.length);
    const options: any = await db.prepare(`SELECT * FROM options WHERE id = ?`).bind(optionsId).first();
    const questions = await db.prepare(`SELECT * FROM questions WHERE options_id = ?`).bind(options.id).all();
    if (hasResults<any>(questions)) {
      const baseOptions: ModalOptions = {
        title: questions.results[0].title,
        components: [
          {
            type: ComponentType.ACTION_ROW,
            components: [
              {
                type: ComponentType.TEXT_INPUT,
                label: questions.results[0].title,
                custom_id: `${optionsId}-1`, // Question ID is [optionsId]-[questionNumber]
                style: questions.results[0].type === 'SHORT' ? TextInputStyle.SHORT : TextInputStyle.PARAGRAPH,
                max_length: 4000
              }
            ]
          }
        ],
        custom_id: optionsId
      };
      await ctx.sendModal(baseOptions);
    }
  } else if (ctx.customID.startsWith('application-')) {
    const applicationId = ctx.customID.substring('application-'.length);
    const application: any = await db.prepare(`SELECT * FROM applications WHERE id = ?`).bind(applicationId).first();
    console.log(`Approved ${application.user_id} ${application.role_id}`);
    creator.requestHandler.request(
      'PUT',
      `/guilds/${ctx.guildID}/members/${application.user_id}/roles/${application.role_id}`
    );
    ctx.send('Hopefully that should be approved now.');
  }
});
