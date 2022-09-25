import { useEffect } from 'react';
import { useAccount } from 'wagmi'
import { useAppContext } from '@components/utils/AppContext'
import { useLazyQuery, useQuery } from '@apollo/client'
import { GET_DEFAULT_PROFILE } from '@graphql/Queries/Profile'

const SetContext = () => {
    const { address, isConnected } = useAccount()
    const { 
        profile,
        setUserAddress, 
        setProfile
      } = useAppContext();
    
     const [getProfile] = useLazyQuery(GET_DEFAULT_PROFILE, {
        variables: {
          request: {
            ethereumAddress: address
          }
        },
        fetchPolicy: 'no-cache',
        onCompleted(data) {console.log(data?.defaultProfile)
          setProfile(data?.defaultProfile);
        },
      })

      useEffect(() => {
        if (isConnected) {
          setUserAddress(address!);
          getProfile()
        }
      }, [isConnected, address, setUserAddress, getProfile]);
    
      return (
        <></>
      )
}

export default SetContext