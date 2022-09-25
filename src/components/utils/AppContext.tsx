import { 
  createContext, 
  Dispatch, 
  ReactNode, 
  SetStateAction, 
  useContext,
  useState 
} from 'react';
import { Profile, Publication } from '@generated/types'

export interface ContextType {
    address: string | undefined;
    profile: Profile | undefined;
    setUserAddress: Dispatch<SetStateAction<string>>;
    setProfile: Dispatch<SetStateAction<Profile | undefined>>;
  }

type Props = {
  children: ReactNode;
};
  
const AppContext = createContext<ContextType>({
  address: undefined,
  profile: undefined,
  setUserAddress: () => {},
  setProfile: () => {},
})

export function AppWrapper({ children }: Props) {
  const [address, setUserAddress] = useState("")
  const [profile, setProfile] = useState<Profile | undefined>()

  const value = {
    address,
    profile,
    setUserAddress,
    setProfile,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  return useContext(AppContext)
}
  
export default AppContext