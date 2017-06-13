const labels = ['High', 'Medium', 'Low'];

const capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Takes a JSON object representing a ticket and turns it into well
 * formatted Slack message
 * @param {object} ticket - JSON representation of the ticket - The title of the book.
 */
const fill = (ticket) => {
  const attachment = {
    title: ticket.title,
    title_link: ticket.link,
    text: ticket.description,
    callback_id: ticket.id,
  };

  attachment.fields = [];

  Object.keys(ticket.fields).forEach((key) => {
    attachment.fields.push({
      title: capitalizeFirstLetter(key),
      value: ticket.fields[key],
      short: true,
    });
  });

  attachment.actions = [{
    name: 'agent',
    text: 'Claim',
    type: 'button',
    value: 'claim',
  },
  {
    name: 'priority',
    text: 'Set a priority',
    type: 'select',
    options: labels.map(label => ({ text: label, value: label })),
  },
  {
    name: 'agent',
    text: 'Assign agent',
    type: 'select',
    data_source: 'users',
  }];

  return { attachments: [attachment] };
};


module.exports = { fill };
