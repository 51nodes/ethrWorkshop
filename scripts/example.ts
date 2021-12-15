import { ethers } from 'hardhat';
import { EthrDID } from 'ethr-did';
import {
  Issuer,
  JwtCredentialPayload,
  createVerifiableCredentialJwt,
  JwtPresentationPayload,
  createVerifiablePresentationJwt,
  verifyPresentation,
  verifyCredential,
} from 'did-jwt-vc';
import { Resolver } from 'did-resolver';
import { getResolver } from 'ethr-did-resolver';

async function main() {
  let accounts = await ethers.getSigners();
  let deployer, alice, aliceSecondKey, bob;
  [deployer, alice, aliceSecondKey, bob] = accounts;

  // Deploy EthereumDIDRegistry
  const EthereumDIDRegistry = await ethers.getContractFactory('EthereumDIDRegistry');
  const registerInstance = await EthereumDIDRegistry.deploy();
  await registerInstance.deployed();
  console.log('EthereumDIDRegistry deployed to:', registerInstance.address);

  // configure the resolver
  const providerConfig = { name: 'private', rpcUrl: 'http://localhost:7545', registry: registerInstance.address, chainId: '0x539' };
  const ethrDidResolver = getResolver(providerConfig);
  const didResolver = new Resolver(ethrDidResolver);

  // get did doc of alice
  const addressOfAlice = alice.address;
  const doc = await didResolver.resolve(`did:ethr:0x539:${addressOfAlice}`);
  console.log(doc);
  console.log(JSON.stringify(doc));
  console.log('----');

  // adding delegate key to alice did document
  // 0x7369674175746800000000000000000000000000000000000000000000000000 is 'veriKey'
  const addressOfSecondKey = aliceSecondKey.address;
  const tx = await registerInstance
    .connect(alice)
    .addDelegate(
      addressOfAlice,
      '0x7369674175746800000000000000000000000000000000000000000000000000',
      addressOfSecondKey,
      ethers.BigNumber.from('111111111')
    );
  await tx.wait();

  // get updated did doc of alice
  const docAfterUpdated = await didResolver.resolve(`did:ethr:0x539:${addressOfAlice}`);
  console.log(docAfterUpdated);
  console.log(JSON.stringify(docAfterUpdated));
  console.log('----');

  // setup issuer (private key of alice)
  const issuer = new EthrDID({
    identifier: `${addressOfAlice}`,
    privateKey: '10e4158a35bf502c0077c1d941e0404eaea0c633dd54702d2d7c9e77bf4e6a18',
    chainNameOrId: '0x539',
  }) as Issuer;

  // create and sign VC
  const vcPayload: JwtCredentialPayload = {
    sub: `did:ethr:0x539:${bob.address}`,
    nbf: 1562950282,
    vc: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
      credentialSubject: {
        degree: {
          type: 'BachelorDegree',
          name: 'Informatik',
        },
      },
    },
  };

  const vcJwt = await createVerifiableCredentialJwt(vcPayload, issuer, { header: { alg: 'ES256K-R' } });
  console.log('vcJwt');
  console.log(vcJwt);

  // verify VC
  const verifiedVC = await verifyCredential(vcJwt, didResolver);
  console.log('verifiedVC');
  console.log(verifiedVC);

  // prepare, create and sign VP using VC
  const bobSigner = new EthrDID({
    identifier: `${bob.address}`,
    privateKey: '870c3b4295c736f4ad6ebe1e5d5de52abfff2fed2fd0ef9d8b528c3568fc400e',
    chainNameOrId: '0x539',
  }) as Issuer;

  const vpPayload: JwtPresentationPayload = {
    vp: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      verifiableCredential: [vcJwt],
    },
  };

  const vpJwt = await createVerifiablePresentationJwt(vpPayload, bobSigner, { header: { alg: 'ES256K-R' } });
  console.log('vpJwt');
  console.log(vpJwt);

  const verifiedVP = await verifyPresentation(vpJwt, didResolver);
  console.log('verifiedVP');
  console.log(verifiedVP);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
