import { useState, useEffect } from 'react';
import { NFTStorage, File } from 'nft.storage'
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import axios from 'axios';

// Components
import Spinner from 'react-bootstrap/Spinner';
import Navigation from './components/Navigation';

// ABIs
import NFT from './abis/NFT.json'

// Config
import config from './config.json';

function App() {
  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)
  const [nft, setNFT] = useState(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState(null)
  const [url, setURL] = useState(null)

  const [isWaiting, setisWaiting] = useState(false)
  const [message, setMessage] = useState("")

  const loadBlockchainData = async () => {
    console.log("Loading Blockchain Data...")
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(provider)

    const network = await provider.getNetwork()
  
    const nft = new ethers.Contract(config[network.chainId].nft.address, NFT, provider)
    setNFT(nft)

    const name = await nft.name()
    console.log("name", name)
  }

  const submitHandler = async (e) => {
    e.preventDefault()

    if(name === ""|| description === ""){
      window.alert("please provide a name and description")
      return
    }

    setisWaiting(true)

    const imageData = await createImage()

    const url = await uploadImage(imageData)

    await mintImage(url)

    setisWaiting(false)
    setMessage("")
  }

  const createImage = async () =>{
    setMessage("Generating Image...")
    
    const URL = `https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2`
          
    // Send the request
      const response = await axios({
        url: URL,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_HUGGING_FACE_API_KEY}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          inputs: description, options: { wait_for_model: true },
        }),
        responseType: 'arraybuffer',
      })



    const type = response.headers['content-type']
    const data = response.data
    console.log(response)

    const base64data = Buffer.from(data).toString('base64')
    const img = `data:${type};base64,` + base64data // <-- This is so we can render it on the page
    setImage(img)

    return data
  }

  const uploadImage = async (imageData) =>{
    setMessage("Uploading Image to IPFS...")

    const nftstorage = new NFTStorage({ token: process.env.REACT_APP_NFT_STORAGE_API_KEY })

    // Send request to store image
    const { ipnft } = await nftstorage.store({
      image: new File([imageData], "image.jpeg", { type: "image/jpeg" }),
      name: name,
      description: description,
    })

      // Save the URL
    const url = `https://ipfs.io/ipfs/${ipnft}/metadata.json`
    setURL(url)

    return url
  }

  const mintImage = async(tokenURI) =>{
    setMessage("waiting for mint..")
    
    const signer = await provider.getSigner()
    const transaction = await nft.connect(signer).mint(tokenURI, { value: ethers.utils.parseUnits("1", "ether")})
    await transaction.wait()

  }


  useEffect(() => {
    loadBlockchainData()
  }, [])

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />

      <div className="form">
        <form onSubmit={submitHandler}>
          <input type="text" placeholder="Create a name..." onChange={(e) => { setName(e.target.value) }}></input>
          <input type="text" placeholder='Create a description'onChange={(e) => { setDescription(e.target.value) }}></input>
          <input type="submit" value='Create and Mint'></input>
        </form>
        
        <div className="image">
          { !isWaiting && image  ? (
              <img src={image} alt="AI Gererated Image"></img>
          ) : isWaiting ? (
            <div className='image__placeholder'>
            <Spinner animation='border' />
            <p>{message}</p>
          </div>
          ) : (
            <></>
          )}
        </div>

      </div>

      { ! isWaiting && url && (
        <p>View&nbsp;<a href={url} target="blank" rel="noreferrer">Metadata</a></p>
      )}
        

      <div>

      </div>



    </div>
  );
}

export default App;
