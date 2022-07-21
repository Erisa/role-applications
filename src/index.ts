import { ComponentType, ModalOptions, TextInputStyle } from 'slash-create';
import { commands } from './commands';
import { SlashCreator, CFWorkerServer } from './shim';

export const creator = new SlashCreator({
  applicationID: DISCORD_APP_ID,
  publicKey: DISCORD_PUBLIC_KEY,
  token: DISCORD_BOT_TOKEN
});

// eslint-disable-next-line no-undef
declare const kv: KVNamespace;

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
  const kvdata: any = await kv.get(ctx.customID, { type: 'json' });

  await kv.put(
    ctx.data.id,
    JSON.stringify({
      type: 'APPLICATION',
      data: {
        user: ctx.user.id,
        role: kvdata.data.role,
        answers: [
          {
            question: kvdata.data.question1_title,
            answer: ctx.values['question1']
          }
        ],
        options_state_key: ctx.customID
      }
    })
  );

  console.log(JSON.stringify(ctx.values['question1']));

  await creator.requestHandler.request('POST', `/channels/${kvdata.data.mod_channel}/messages`, true, {
    content: `New application for <@&${kvdata.data.role}> submitted by <@${ctx.user.id}>!`,
    allowed_mentions: {
      parse: []
    },
    embeds: [
      {
        title: kvdata.data.question1_title,
        description: ctx.values['question1'],
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
            custom_id: ctx.data.id
          }
        ]
      }
    ]
  });

  ctx.send('Your application has been submitted.', { ephemeral: true });
});

creator.on('componentInteraction', async (ctx) => {
  // we kept all the state in KV because it lets us store more.
  // the custom ID is the key and tells us where the state is
  const kvdata: any = await kv.get(ctx.customID, { type: 'json' });

  if (kvdata.type === 'OPTIONS') {
    const baseOptions: ModalOptions = {
      title: kvdata.data.title,
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.TEXT_INPUT,
              label: kvdata.data.question1_title,
              custom_id: 'question1',
              style: kvdata.data.question1_type === 'SHORT' ? TextInputStyle.SHORT : TextInputStyle.PARAGRAPH,
              max_length: 4000
            }
          ]
        }
      ],
      custom_id: ctx.customID
    };
    await ctx.sendModal(baseOptions);
  } else if (kvdata.type === 'APPLICATION') {
    creator.requestHandler.request(
      'PUT',
      `/guilds/${ctx.guildID}/members/${kvdata.data.user}/roles/${kvdata.data.role}`
    );
    ctx.send('Hopefully that should be approved now.');
  }
});
