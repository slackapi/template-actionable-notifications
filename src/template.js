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
  const label = labels.find(l => l.name === ticket.fields.priority);
  const attachment = {
    title: ticket.title,
    title_link: ticket.link,
    text: ticket.description,
    callback_id: ticket.id,
    color: (label && label.color) || '#3b6e7f',
  };

  attachment.fields = [];

  Object.keys(ticket.fields).forEach((key) => {
    attachment.fields.push({
      title: capitalizeFirstLetter(key),
      value: ticket.fields[key],
      short: true,
    });
  });

  if (isActionable) {
    attachment.actions = [{
      name: 'agent',
      text: 'Claim',
      type: 'button',
      value: 'claim',
      style: 'primary',
    },
    {
      name: 'priority',
      text: 'Set a priority',
      type: 'select',
      options: labels.map(l => ({ text: l.name, value: l.name })),
    },
    {
      name: 'agent',
      text: 'Assign agent',
      type: 'select',
      data_source: 'users',
    }];
  }

  return { attachments: [attachment] };
};

module.exports = { fill };
