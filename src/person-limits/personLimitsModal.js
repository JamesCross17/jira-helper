import personLimitsModal from './personLimitsModal.html';
import { extensionApiService } from '../shared/ExtensionApiService';
import { getUser } from '../shared/jiraApi';
import { BOARD_PROPERTIES } from '../shared/constants';

const renderRow = ({ id, person, limit, columns, swimlanes }, deleteLimit) => {
  document.querySelector('#persons-limit-body').insertAdjacentHTML(
    'beforeend',
    `
    <tr id="row-${id}" class="person-row">
      <td><input type="checkbox" class="checkbox select-user-chb" data-id="${id}"></td>
      <td>${person.displayName}</td>
      <td>${limit}</td>
      <td>${columns.map(c => c.name).join(', ')}</td>
      <td>${swimlanes.map(s => s.name).join(', ')}</td>
      <td><button class="aui-button" id="delete-${id}">Delete</button></td>
    </tr>
  `
  );

  document.querySelector(`#delete-${id}`).addEventListener('click', async () => {
    await deleteLimit(id);
    document.querySelector(`#row-${id}`).remove();
  });
};

export const openPersonLimitsModal = async (modification, boardData, personLimits) => {
  const deleteLimit = async id => {
    personLimits.limits = personLimits.limits.filter(limit => limit.id !== id);
    await modification.updateBoardProperty(BOARD_PROPERTIES.PERSON_LIMITS, personLimits);
  };

  const modal = modification.insertHTML(document.body, 'beforeend', personLimitsModal);

  const columnsSelect = modal.querySelector('.columns select');
  boardData.rapidListConfig.mappedColumns.forEach(({ id, name }) => {
    const option = document.createElement('option');
    option.text = name;
    option.value = id;
    option.selected = true;
    columnsSelect.appendChild(option);
  });

  const swimlanesSelect = modal.querySelector('.swimlanes select');
  boardData.swimlanesConfig.swimlanes.forEach(({ id, name }) => {
    const option = document.createElement('option');
    option.text = name;
    option.value = id;
    option.selected = true;
    swimlanesSelect.appendChild(option);
  });

  modal.querySelector('#person-limit-save-button').addEventListener('click', async e => {
    e.preventDefault();

    const person = modal.querySelector('#person-name').value;
    const limit = modal.querySelector('#limit').valueAsNumber;
    const columns = [...columnsSelect.selectedOptions].map(option => ({ id: option.value, name: option.text }));
    const swimlanes = [...swimlanesSelect.selectedOptions].map(option => ({ id: option.value, name: option.text }));

    const fullPerson = await getUser(person);

    const personLimit = {
      id: Date.now(),
      person: {
        name: fullPerson.name ?? fullPerson.displayName,
        displayName: fullPerson.displayName,
        self: fullPerson.self,
        avatar: fullPerson.avatarUrls['32x32'],
      },
      limit,
      columns,
      swimlanes,
    };

    personLimits.limits.push(personLimit);

    await modification.updateBoardProperty(BOARD_PROPERTIES.PERSON_LIMITS, personLimits);

    renderRow(personLimit, deleteLimit);
  });

  modal.querySelector('#apply-columns').addEventListener('click', async e => {
    e.preventDefault();

    const columns = [...columnsSelect.selectedOptions].map(option => ({ id: option.value, name: option.text }));
    const persons = [...modal.querySelectorAll('.select-user-chb:checked')].map(elem => Number(elem.dataset.id));

    personLimits.limits = personLimits.limits.map(limit =>
      persons.includes(limit.id)
        ? {
            ...limit,
            columns,
          }
        : limit
    );

    await modification.updateBoardProperty(BOARD_PROPERTIES.PERSON_LIMITS, personLimits);

    modal.querySelectorAll('.person-row').forEach(row => row.remove());
    personLimits.limits.forEach(personLimit => renderRow(personLimit, deleteLimit));
  });

  modal.querySelector('#apply-swimlanes').addEventListener('click', async e => {
    e.preventDefault();

    const swimlanes = [...swimlanesSelect.selectedOptions].map(option => ({ id: option.value, name: option.text }));
    const persons = [...modal.querySelectorAll('.select-user-chb:checked')].map(elem => Number(elem.dataset.id));

    personLimits.limits = personLimits.limits.map(limit =>
      persons.includes(limit.id)
        ? {
            ...limit,
            swimlanes,
          }
        : limit
    );

    await modification.updateBoardProperty(BOARD_PROPERTIES.PERSON_LIMITS, personLimits);

    modal.querySelectorAll('.person-row').forEach(row => row.remove());
    personLimits.limits.forEach(personLimit => renderRow(personLimit, deleteLimit));
  });

  personLimits.limits.forEach(personLimit => renderRow(personLimit, deleteLimit));

  //  window.AJS is not available here
  const script = document.createElement('script');
  script.setAttribute('src', extensionApiService.getUrl('nativeModalScript.js'));
  document.body.appendChild(script);
};
