export const events = [
  {
    name: 'clickItem',
    description: 'Dispatched when an element of the list is clicked.',
  },
  {
    name: 'selectItem',
    description: 'Dispatched when an element of the list is selected, navigating through it.',
  },
  {
    name: 'clickAddNew',
    description: 'Dispatched when element Add New is clicked.',
  },
  {
    name: 'lazyLoad',
    description: 'Dispatched when listBox in LazyMode and tries to get more data.',
  },
  {
    name: 'filterData',
    parameters: [
      {
        event: 'Array<Data>', description: 'Filtered data',
      },
    ],
    description: 'Dispatched when listBox is filtered.',
  },
];
