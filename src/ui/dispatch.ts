import { createContext, useContext, type Dispatch } from "react";
import type { Action } from "../state/reducer";

export const DispatchCtx = createContext<Dispatch<Action>>(() => {
  throw new Error("dispatch used outside a provider");
});

export const useDispatch = () => useContext(DispatchCtx);
