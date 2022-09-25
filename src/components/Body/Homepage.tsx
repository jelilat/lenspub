import Image from 'next/image'
import Link from 'next/link'
import { PencilAltIcon } from '@heroicons/react/outline'
import { useMutation } from '@apollo/client'
import { useState, useEffect } from 'react'
import { 
    useAccount,
    chain as chains,
    useSignTypedData,
    useContractWrite,
    useNetwork 
} from 'wagmi'
import { utils } from 'ethers'
import omit from 'src/lib/omit'
import { uploadToIPFS, uploadImageToIPFS } from 'src/lib/uploadToIPFS'
import { useAppContext } from '@components/utils/AppContext'
import { v4 as uuidv4 } from 'uuid'
import { CREATE_POST_TYPED_DATA } from '@graphql/Mutations/Publication'
import { LensHubProxy } from 'src/abis/LensHubProxy'
import { CreatePostBroadcastItemResult } from '@generated/types'

const Home = () => {
    const { profile } = useAppContext()
    const { address, isConnected } = useAccount()
    const { chain } = useNetwork()
    const [contentURI, setContentURI] = useState<string>('');
    const [activities, setActivities] = useState([])
    const [names, setNames] = useState<Array<string>>([])
    const [post, setPost] = useState("")

    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isListing, setIsListing] = useState<boolean>(false);
    const [content, setContent] = useState<{title: string, description: string}>({
        title: '',
        description: ''
    });
    const [image, setImage] = useState<string>('');
    const [imageMimeType, setImageMimeType] = useState<string>('');

    const { isLoading: signLoading, signTypedDataAsync } = useSignTypedData({
        onError(error) {
          console.log(error?.message)
        }
      })

    const { write } = useContractWrite({
        addressOrName: '0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d',
        contractInterface: LensHubProxy,
        functionName: 'postWithSig',
        mode: 'recklesslyUnprepared',
        onError(error) {
            console.log(error?.message)
        },
        onSuccess(data: any) {
            console.log('Successfully posted', data)
        }
    })

    const [createPostTypedData] = useMutation(CREATE_POST_TYPED_DATA, {
        onCompleted({
            createPostTypedData
        }: {
            createPostTypedData: CreatePostBroadcastItemResult
        }) {
            console.log(createPostTypedData)
            const { id, typedData } = createPostTypedData
                const {
                    profileId,
                    contentURI,
                    collectModule,
                    collectModuleInitData,
                    referenceModule,
                    referenceModuleInitData,
                    deadline
                } = typedData?.value

                signTypedDataAsync({
                    domain: omit(typedData?.domain, '__typename'),
                    types: omit(typedData?.types, '__typename'),
                    value: omit(typedData?.value, '__typename')
                  }).then((signature) => {
                    const { v, r, s } = utils.splitSignature(signature)
                    const sig = { v, r, s, deadline }
                    const inputStruct = {
                      profileId,
                      contentURI,
                      collectModule,
                      collectModuleInitData,
                      referenceModule,
                      referenceModuleInitData,
                      sig
                    }

                    write?.({ recklesslySetUnpreparedArgs: inputStruct })
                })         
        }
    })

    const listItem = async () => {
        if (!isConnected) {
            alert("Connect your wallet")
        } else if (chain?.id !== chains.polygon.id ) {
            alert("Connect your wallet to Polygon")
        } else if (profile === undefined) {
            alert("You don't have a lens profile")
        } else {
            setIsUploading(true)
            const { path } = await uploadToIPFS({
                version: '1.0.0',
                metadata_id: uuidv4(),
                description: content?.title,
                content: content?.description,
                image: image,
                imageMimeType: imageMimeType,
                name: `Item listed by @${profile?.handle}`,
                mainContentFocus: "TEXT",
                attributes: [
                    {
                        //fix this
                        traitType: 'string',
                        key: 'type',
                        value: 'post'
                    }
                ],
                media: [{
                    item: image,
                    type: imageMimeType
                }],
                createdOn: new Date(),
                appId: 'lenspub'
            })
            setIsUploading(false)
            setContentURI(`https://ipfs.infura.io/ipfs/${path}`)
            console.log("Posting", contentURI)
            createPostTypedData({
                variables: {
                    request: {
                        profileId: profile?.id,
                        contentURI: contentURI,
                        collectModule: {
                            "freeCollectModule": { "followerOnly": false }
                        },
                        referenceModule: {
                            "followerOnlyReferenceModule": false
                        }
                    }
                }
            })
        }
    }

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
                    <button onClick={()=> listItem()}
                        className="text-white bg-black rounded-lg px-2 py-1 my-1">
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