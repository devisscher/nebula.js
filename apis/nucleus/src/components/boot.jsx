import React from 'react';
import ReactDOM from 'react-dom';
import Cell from './Cell';

export default function boot({ element, model, api, nebulaContext, onInitial }) {
  const { root } = nebulaContext;

  const portal = ReactDOM.createPortal(<Cell api={api} model={model} onInitial={onInitial} />, element);
  portal.key = model.id; // TODO - handle same model being booted again

  const unmount = () => {
    root.remove(portal);
  };

  model.once('closed', unmount);

  root.add(portal);

  return () => {
    unmount();
  };
}
