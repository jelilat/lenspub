import Image from 'next/image'
import Link from 'next/link'
import { PencilAltIcon } from '@heroicons/react/outline'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

const Home = () => {
    const { address, isConnected } = useAccount()
    const [activities, setActivities] = useState([])
    const [names, setNames] = useState<Array<string>>([])
    const [post, setPost] = useState("")

    const getTokenDetails = async (token_id: string, contractAddress: string) => {
        const options = {
            method: 'GET',
            headers: {'Content-Type': 'application/json', Authorization: process.env.NEXT_PUBLIC_NFTPRORT!}
          };
          
        const resp = await fetch(`https://api.nftport.xyz/v0/nfts/${contractAddress}/${token_id}?chain=ethereum`, options)
            .then(async (response) => await response.json())
            .then(response => {
                console.log(response)
                return response
            })
            .catch(err => console.error(err));

        return resp
    }

    useEffect(() => {
        if (isConnected) {
            const options = {
                method: 'GET',
                headers: {'Content-Type': 'application/json', Authorization: process.env.NEXT_PUBLIC_NFTPRORT!},
              };
              
              fetch(`https://api.nftport.xyz/v0/transactions/accounts/${address}?chain=ethereum&page_size=3&type=buy&type=sell&type=mint`, options)
                .then(async (response) => await response.json())
                .then(response => {
                    setActivities(response.transactions)
                })
                .catch(err => console.error(err));
        }
    }, [isConnected, address])

    useEffect(()=>{
        activities?.map(async (activity: any) => {
            var token_id = ""
            var contractAddress = ""
            if (activity?.type === "mint") {
                token_id = activity?.token_id
                contractAddress = activity?.contract_address
            } else {
                token_id = activity?.nft?.token_id
                contractAddress = activity?.nft?.contract_address
            }
            const tokenDetails = await getTokenDetails(token_id, contractAddress)
            setNames(names => [...names, tokenDetails.nft?.contract?.name])
        })
    }, [activities])

    return (
        <>
            <div className="lg:flex md:flex sm:inline-block m-14 p-3">
                <div className="w-2/3 border-2 rounded-lg mr-5 p-5">
                    <textarea defaultValue={post}
                        className="w-full h-24 border-2 rounded-lg p-5" 
                        placeholder="Enter your text here" />
                    <button className="text-white bg-black rounded-lg px-2 py-1 my-1">
                        <PencilAltIcon className="w-5 h-5 inline-block mr-1" />
                        Post
                    </button>
                </div>
                <div className="w-1/3 border-2 rounded-lg ml-5">
                    {
                        activities?.map((activity: any, index) => {
                            return (
                                <div key={index} className="p-3 border-b-2 break-words" onClick={(event) => {
                                    setPost((event.currentTarget.textContent!).slice(0, -4))
                                }}>
                                    {
                                        activity?.type === 'mint' &&
                                        <div>
                                            <p>Hey Lensters,</p>
                                            <p>I just minted {activity?.quantity} {names[index]} NFT. Check it out {`https://opensea.io/assets/ethereum/${activity?.contract_address}/${activity?.token_id}`}</p>
                                        </div>
                                    }{ 
                                        activity?.type === 'sale' &&
                                        <div>
                                            <p>Hey Lensters,</p>
                                            <p>I just {
                                                activity?.buyer_address == address ? 'bought' : 'sold'
                                                } {activity?.quantity} {names[index]} NFT for {activity?.price_details?.price}{activity?.price_details?.asset_type}. Check it out here {`https://opensea.io/assets/ethereum/${activity?.nft?.contract_address}/${activity?.nft?.token_id}`}</p>
                                        </div>
                                    }
                                    {
                                        activity?.type === 'cancel_list' && 
                                        <div>
                                            <p>Hey Lensters,</p>
                                            <p>I just listed an NFT. Check it out {`https://opensea.io/assets/ethereum/${activity?.nft?.contract_address}/${activity?.nft?.token_id}`}</p>
                                        </div>
                                    }
            
                                        <button
                                            className="text-white bg-black rounded-lg px-2 py-1 my-1">
                                            <PencilAltIcon className="w-5 h-5 inline-block mr-1" />
                                                Post
                                            </button>
                                    
                                </div>
                            )
                        })
                    }
                </div>
            </div>
        </>
    )
}

export default Home