/**
 * Lionel Train Controller Card - Thomas default wrapper
 *
 * Upload this file as lionel-train-card.js in your fork.
 * It loads the original Lionel card, keeps the Generic and Polar Express
 * announcement mappings, adds Thomas, and makes Thomas the fallback/default
 * when no train model sensor is available or the model comes back as Generic.
 */

(() => {
  const UPSTREAM_LIONEL_CARD_URL =
    'https://cdn.jsdelivr.net/gh/BlackandBlue1908/ha_lionel_card@main/lionel-train-card.js';

  const DEFAULT_MODEL = 'Thomas The Tank Engine';

  // Set this to false if you ever want an explicit Generic sensor state to show
  // the original Generic/Penna Flyer labels instead of Thomas labels.
  const TREAT_GENERIC_AS_THOMAS = true;

  const MODEL_ANNOUNCEMENTS = {
    Generic: {
      random: 'Random',
      ready_to_roll: 'Ready to Roll',
      hey_there: 'Hey There',
      squeaky: 'Squeaky',
      water_and_fire: 'Water & Fire',
      fastest_freight: 'Fastest Freight',
      penna_flyer: 'Penna Flyer',
    },

    'Polar Express': {
      random: 'Random',
      ready_to_roll: 'Polar Express',
      hey_there: 'All Aboard',
      squeaky: 'You Coming?',
      water_and_fire: 'Tickets',
      fastest_freight: 'First Gift',
      penna_flyer: 'The King',
    },

    'Thomas The Tank Engine': {
      random: 'Random',
      ready_to_roll: 'Oh Yeah',
      hey_there: 'All Aboard',
      squeaky: 'Full Steam Ahead',
      water_and_fire: 'Number 1 Engine',
      fastest_freight: 'On Track',
      penna_flyer: 'Rocking the Rails',
    },
  };

  function resolveModel(modelName) {
    if (!modelName || modelName === 'unknown' || modelName === 'unavailable') {
      return DEFAULT_MODEL;
    }

    if (modelName === 'Generic' && TREAT_GENERIC_AS_THOMAS) {
      return DEFAULT_MODEL;
    }

    if (MODEL_ANNOUNCEMENTS[modelName]) {
      return modelName;
    }

    return DEFAULT_MODEL;
  }

  function rerenderIfReady(card) {
    if (card.shadowRoot && card.shadowRoot.innerHTML && typeof card._render === 'function') {
      card._render();
    }
  }

  function patchLionelCard() {
    const LionelTrainCard = customElements.get('lionel-train-card');

    if (!LionelTrainCard) {
      console.error('[ha_lionel_card] Lionel card loaded, but lionel-train-card was not registered.');
      return;
    }

    const proto = LionelTrainCard.prototype;

    if (proto.__thomasDefaultPatchApplied) {
      return;
    }

    const originalSetConfig = proto.setConfig;

    proto.setConfig = function patchedSetConfig(config) {
      originalSetConfig.call(this, config);

      const resolvedModel = resolveModel(this._trainModel);
      if (this._trainModel !== resolvedModel) {
        this._trainModel = resolvedModel;
        rerenderIfReady(this);
      }
    };

    proto._updateTrainModel = function patchedUpdateTrainModel() {
      let sensorModel;

      if (this._hass && this._deviceName && typeof this._getEntityId === 'function') {
        const trainModelEntity = this._getEntityId('sensor', 'train_model');
        const trainModelState = this._hass.states[trainModelEntity];
        sensorModel = trainModelState && trainModelState.state;
      }

      const resolvedModel = resolveModel(sensorModel || this._trainModel);

      if (resolvedModel !== this._trainModel) {
        this._trainModel = resolvedModel;
        rerenderIfReady(this);
      }
    };

    proto._getAnnouncementName = function patchedGetAnnouncementName(key) {
      const resolvedModel = resolveModel(this._trainModel);
      const model = MODEL_ANNOUNCEMENTS[resolvedModel] || MODEL_ANNOUNCEMENTS[DEFAULT_MODEL];
      return model[key] || key;
    };

    proto.__thomasDefaultPatchApplied = true;
    console.info('[ha_lionel_card] Thomas default announcement patch applied.');
  }

  function loadOriginalCard() {
    return new Promise((resolve, reject) => {
      if (customElements.get('lionel-train-card')) {
        resolve();
        return;
      }

      const existingScript = document.querySelector(`script[src="${UPSTREAM_LIONEL_CARD_URL}"]`);
      if (existingScript) {
        existingScript.addEventListener('load', resolve, { once: true });
        existingScript.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = UPSTREAM_LIONEL_CARD_URL;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  loadOriginalCard()
    .then(() => customElements.whenDefined('lionel-train-card'))
    .then(patchLionelCard)
    .catch((error) => {
      console.error('[ha_lionel_card] Failed to load or patch Lionel card:', error);
    });
})();
