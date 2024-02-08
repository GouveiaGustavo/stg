function normalizeSegmentation(segmentation) {
  if (Array.isArray(segmentation)) {
    return segmentation.map(Number);
  } else {
    return [Number(segmentation)];
  }
}

function compareParticipanteData(params, participants, logError, user, participantActualSegmentation) {
  let putParticipantData = {};
  let mensagemLog = [];
  let changes = [];

  if (participants.data.length) {
    const currentDocument = participants.data[0].participant.document;
    putParticipantData.approve_participants = params.approve_participants;
    putParticipantData.name = params.name;
    putParticipantData.surname = params.surname;
    putParticipantData.code = params.code;
    putParticipantData.accepted_terms = params.accepted_terms;
    putParticipantData.gender = params.gender_id;
    putParticipantData.email = params.email;
    if (params.birthdate) {
      putParticipantData.birthdate = new Date(params.birthdate + 'T03:00:00.000Z').toISOString();
    } else {
      putParticipantData.birthdate = null;
    }
    if (params.contact.length) {
      putParticipantData.number = params.contact;
    } else {
      putParticipantData.area_code = null;
      putParticipantData.number = null;
    }
    putParticipantData.segmentation_id = normalizeSegmentation(params.segmentation);

    let oldParticipantData = {};

    oldParticipantData.name = participants.data[0].participant.name;
    oldParticipantData.surname = participants.data[0].participant.surname;
    oldParticipantData.code = participants.data[0].code;
    oldParticipantData.approve_participants = participants.data[0].approve_participants;
    oldParticipantData.accepted_terms = participants.data[0].accepted_terms;
    oldParticipantData.gender = participants.data[0].participant.gender_id;
    oldParticipantData.email = participants.data[0].email;
    if (participants.data[0].participant.birthdate) {
      oldParticipantData.birthdate = participants.data[0].participant.birthdate;
    } else {
      oldParticipantData.birthdate = null;
    }
    if (participants.data[0].contact) {
      oldParticipantData.number = participants.data[0].contact.number;
    } else {
      oldParticipantData.number = null;
    }
    oldParticipantData.segmentation_id = normalizeSegmentation(participantActualSegmentation);

    let mudancas = {};

    for (let chave in putParticipantData) {
      if (JSON.stringify(putParticipantData[chave]) !== JSON.stringify(oldParticipantData[chave])) {
        mudancas[chave] = {
          valorAntigo: oldParticipantData[chave],
          valorNovo: putParticipantData[chave],
        };
        changes.push({
          valorAntigo: mudancas[chave].valorAntigo,
          valorNovo: mudancas[chave].valorNovo,
          alteracao: chave,
        });
      }
    }

    if (Object.keys(mudancas).length) {
      mensagemLog.push(
        `${logError} - Foram alterados os seguintes campos do participante: *${params.document}*, da campanha: *${params.campaign_id}*, pelo usuário: *${user.data.name} ${user.data.surname}*\n`
      );
      for (let chave in mudancas) {
        mensagemLog += `Campo: *${chave}*, Valor Antigo: ${mudancas[chave].valorAntigo}, Valor Novo: ${mudancas[chave].valorNovo}\n`;
      }
    }

    if (params.document !== currentDocument) {
      mensagemLog += `<!channel> Tentativa de troca de documento, documento atual: ${currentDocument}, documento enviado para troca: ${params.document}`;
    }
  } else {
    mensagemLog = `${logError} - Foi cadastrado um novo participante: *${params.document}*, na campanha: *${params.campaign_id}*, pelo usuário: *${user.data.name} ${user.data.surname}*`;
  }

  return { message: mensagemLog, change: changes };
}

module.exports = compareParticipanteData;
