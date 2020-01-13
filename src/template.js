const labels = [
  { name: 'High', color: '#c13101' },
  { name: 'Medium', color: '#c19a38' },
  { name: 'Low', color: '#f2ea15' }];

const capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Takes a JSON object representing a ticket and turns it into well
 * formatted Slack message
 * @param {object} ticket - JSON representation of the ticket - The title of the book.
 * @param {boolean} isActionable - Should message actions be shown?
 */
const fill = (ticket, isActionable) => {
  isActionable = isActionable === undefined ? true : isActionable;

  let header_block = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `<${ticket.link}|${ticket.title}>\n${ticket.description}`
    },
  }

  if (isActionable) {
    // Add a claim button to the message
    header_block.accessory = {
      type: 'button',
      action_id: `claim.${ticket.id}`,
      text: {
        type: 'plain_text',
        text: 'Claim'
      }
    };
  }

  let blocks = [header_block];


  let field_blocks = [];

  Object.keys(ticket.fields).forEach((key) => {
    field_blocks.push({
      type: 'mrkdwn',
      text: `*${capitalizeFirstLetter(key)}* \n ${ticket.fields[key]} `
    });
  });

  blocks.push({
    type: 'section',
    fields: field_blocks
  });

  if (isActionable) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'users_select',
          action_id: `agent.${ticket.id}`,
          placeholder: {
            type: 'plain_text',
            text: 'Assign agent'
          }
        },
        {
          type: 'static_select',
          action_id: `priority.${ticket.id}`,
          placeholder: {
            type: 'plain_text',
            text: 'Set a priority'
          },
          options: labels.map(l => ({ text: { type: 'plain_text', text: l.name }, value: l.name }))
        }
      ]
    }
    );
  }

  return blocks;
};

module.exports = { fill };
