import { createContext, useContext } from 'react'

export const SidebarContext = createContext({
  onMenuToggle: () => {},
})

export const useSidebar = () => useContext(SidebarContext)
