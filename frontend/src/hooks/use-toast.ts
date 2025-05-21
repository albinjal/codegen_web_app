import { useState, useEffect, useCallback } from "react"

import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

export type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function generateId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: string
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: string
    }

interface State {
  toasts: ToasterToast[]
}

// Simplified reducer using useState
function useToastReducer() {
  const [state, setState] = useState<State>({ toasts: [] })

  const dispatch = useCallback((action: Action) => {
    setState((prevState) => {
      switch (action.type) {
        case actionTypes.ADD_TOAST:
          return {
            ...prevState,
            toasts: [action.toast, ...prevState.toasts].slice(0, TOAST_LIMIT),
          }

        case actionTypes.UPDATE_TOAST:
          return {
            ...prevState,
            toasts: prevState.toasts.map((t) =>
              t.id === action.toast.id ? { ...t, ...action.toast } : t
            ),
          }

        case actionTypes.DISMISS_TOAST: {
          const { toastId } = action

          if (toastId) {
            return {
              ...prevState,
              toasts: prevState.toasts.map((t) =>
                t.id === toastId ? { ...t, open: false } : t
              ),
            }
          }

          return {
            ...prevState,
            toasts: prevState.toasts.map((t) => ({ ...t, open: false })),
          }
        }

        case actionTypes.REMOVE_TOAST:
          if (action.toastId === undefined) {
            return {
              ...prevState,
              toasts: [],
            }
          }
          return {
            ...prevState,
            toasts: prevState.toasts.filter((t) => t.id !== action.toastId),
          }
      }
    })
  }, [])

  return { state, dispatch }
}

export const useToast = () => {
  const { state, dispatch } = useToastReducer()

  useEffect(() => {
    state.toasts.forEach((toast) => {
      if (toast.open === false) {
        setTimeout(() => {
          dispatch({
            type: actionTypes.REMOVE_TOAST,
            toastId: toast.id,
          })
        }, TOAST_REMOVE_DELAY)
      }
    })
  }, [state.toasts, dispatch])

  const toast = useCallback(
    (props: Omit<ToasterToast, "id">) => {
      const id = generateId()

      dispatch({
        type: actionTypes.ADD_TOAST,
        toast: {
          ...props,
          id,
          open: true,
        },
      })

      return id
    },
    [dispatch]
  )

  const update = useCallback(
    (id: string, props: Partial<ToasterToast>) => {
      dispatch({
        type: actionTypes.UPDATE_TOAST,
        toast: { ...props, id },
      })
    },
    [dispatch]
  )

  const dismiss = useCallback(
    (id?: string) => {
      dispatch({
        type: actionTypes.DISMISS_TOAST,
        toastId: id,
      })
    },
    [dispatch]
  )

  return {
    toasts: state.toasts,
    toast,
    update,
    dismiss,
  }
}
