/* eslint no-underscore-dangle: 0 */
import eventmixin from './event-mixin';
// import visual from '../components/selections/AppSelections';

import modelCache from '../object/model-cache';
import { observe } from '../object/observer';

const cache = {};

const create = app => {
  let canGoForward = false;
  let canGoBack = false;
  let canClear = false;

  let modalObject;
  // let mounted;
  let lyt;
  let currentSelectionsModel;
  let prom;

  /**
   * @interface
   * @alias AppSelections
   */
  const api = /** @lends AppSelections */ {
    /** @type {EnigmaAppModel} */
    model: app,
    /**
     * @param {EnigmaObjectModel} object
     * @param {string} path
     * @param {boolean} [accept=true]
     * @emits AppSelections#modal-unset
     * @emits AppSelections#modal
     */
    switchModal(object, path, accept = true) {
      if (object === modalObject) {
        return prom || Promise.resolve();
      }
      if (modalObject) {
        modalObject.endSelections(accept);
        api.emit('modal-unset');
        modalObject._selections.emit('deactivated');
      }
      if (object && object !== null) {
        // TODO check model state
        modalObject = object;
        api.emit('modal', modalObject._selections);
        prom = currentSelectionsModel.then(() => {
          // do not return the call to beginSelection to avoid waiting for it's response
          modalObject.beginSelections(Array.isArray(path) ? path : [path]).catch(err => {
            if (err.code === 6003) {
              // If another object already is in modal -> abort and take over
              return api.abortModal().then(() => object.beginSelections(Array.isArray(path) ? path : [path]));
            }
            throw err;
          });
        });
        return prom;
      }
      modalObject = null;
      api.emit('modal-unset');
      prom = Promise.resolve();
      return prom;
    },
    /**
     * @param {EnigmaObjectModel} objectModel
     * @returns {boolean}
     */
    isModal(objectModel) {
      // TODO check model state
      return objectModel ? modalObject === objectModel : modalObject !== null;
    },
    /**
     * @param {boolean} [accept=true]
     * @returns {Promise<EmptyObject>}
     */
    abortModal(accept = true) {
      if (!modalObject) {
        return Promise.resolve({});
      }
      // modalObject._selections.
      modalObject = null;
      api.emit('modal-unset');
      return app.abortModal(accept);
    },
    /**
     * @returns {boolean}
     */
    canGoForward() {
      return canGoForward;
    },
    /**
     * @returns {boolean}
     */
    canGoBack() {
      return canGoBack;
    },
    /**
     * @returns {boolean}
     */
    canClear() {
      return canClear;
    },
    layout() {
      return lyt;
    },
    /**
     * @returns {Promise<EmptyObject>}
     */
    forward() {
      return this.switchModal().then(() => app.forward());
    },
    /**
     * @returns {Promise<EmptyObject>}
     */
    back() {
      return this.switchModal().then(() => app.back());
    },
    /**
     * @returns {Promise<{}>}
     */
    clear() {
      return this.switchModal().then(() => app.clearAll());
    },
    /**
     * @returns {Promise<boolean>}
     */
    clearField(field, state = '$') {
      return this.switchModal().then(() => app.getField(field, state).then(f => f.clear()));
    },
  };

  /**
   * @event AppSelections#modal-unset
   */

  /**
   * @event AppSelections#modal
   * @param {ObjectSelections} selections
   */

  eventmixin(api);

  currentSelectionsModel = modelCache(
    {
      qInfo: {
        qType: 'current-selections',
      },
      qSelectionObjectDef: {
        qStateName: '$',
      },
      alternateStates: [],
    },
    app
  )
    .then(model => {
      observe(app, appLayout => {
        const states = [...appLayout.qStateNames].map(s => ({
          stateName: s, // need this as reference in selection toolbar since qSelectionObject.qStateName is not in the layout
          qSelectionObjectDef: {
            qStateName: s,
          },
        }));
        const existingStates = (lyt ? lyt.alternateStates.map(s => s.stateName) : []).join('::');
        const newStates = appLayout.qStateNames.map(s => s).join('::');
        if (existingStates !== newStates) {
          model.applyPatches(
            [
              {
                qOp: 'replace',
                qPath: '/alternateStates',
                qValue: JSON.stringify(states),
              },
            ],
            true
          );
        }
      });

      observe(model, layout => {
        canGoBack = false;
        canGoForward = false;
        canClear = false;
        [layout, ...layout.alternateStates].forEach(state => {
          canGoBack = canGoBack || state.qSelectionObject.qBackCount > 0;
          canGoForward = canGoForward || state.qSelectionObject.qForwardCount > 0;
          canClear = canClear || state.qSelectionObject.qSelections.filter(s => s.qLocked !== true).length > 0;
        });
        lyt = layout;
        api.emit('changed');
      });
      model.once('closed', () => {
        app._selections = null; // eslint-disable-line no-param-reassign
        cache[app.id] = null;
      });
    })
    .catch(() => {
      // do something
    });

  return api;
};

export default function(app) {
  if (!cache[app.id]) {
    cache[app.id] = {
      selections: null,
    };
    Object.defineProperty(app, '_selections', {
      get() {
        cache[app.id].selections = cache[app.id].selections || create(app);
        return cache[app.id].selections;
      },
      set(v) {
        cache[app.id].selections = v;
      },
    });
  }
}
