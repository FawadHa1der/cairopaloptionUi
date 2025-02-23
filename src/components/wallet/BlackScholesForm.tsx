import {
  Box,
  Button,
  Code,
  Link,
  Text,
  useBreakpointValue, Divider,

  useColorMode,
} from "@chakra-ui/react";
import { Abi, number, stark } from "starknet";
import { useContract, useStarknet, useStarknetInvoke, useStarknetCall } from "@starknet-react/core";
import { FormErrorMessage, FormLabel, FormControl, Input } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useToast } from '@chakra-ui/react'
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';


// import our custom configuration for our chart
import { Config } from './ChartConfig';
// import { connect, getStarknet } from "@argent/get-starknet"

import { getStarknet } from "get-starknet"

import scholesAbi from "../../abi/black_scholes_contract.json";
import { callContract, createContract } from "utils/blockchain/starknet";
import { parseToUint256 } from "utils/parser";
import { BigNumber } from 'bignumber.js'
// t_annualised, volatility, spot, strike, rate


const CAIRO_PRIME = '3618502788666131213697322783095070105623107215331596699973092056135872020481'
const BlackScholesForm = () => {
  const toast = useToast()

  interface IScholes {
    t_annualised: number;
    volatility: number;
    spot: number;
    strike: number;
    rate: number;
  }

  const [chartData, setChartData] = useState<any>({
    labels: [1],
    datasets: [
      {
        label: "Asset Price",
        data: [1],
        fill: true,
        backgroundColor: "rgba(75,192,192,0.2)",
        borderColor: "rgba(75,192,192,1)"
      }
    ]

  })

  const [callPrice, setCallPrice] = useState<string>();
  const [putPrice, setPutPrice] = useState<string>();

  const [vega, setVega] = useState<string>();

  const [callTheta, setCallTheta] = useState<string>();
  const [putTheta, setPutTheta] = useState<string>();

  const [callRho, setCallRho] = useState<string>();
  const [putRho, setPutRho] = useState<string>();

  const [vomma, setVomma] = useState<string>();

  const [vanna, setVanna] = useState<string>();
  const [gamma, setGamma] = useState<string>();

  const [callDelta, setCallDelta] = useState<string>();
  const [putDelta, setPutDelta] = useState<string>();


  const UNIT = 10 ** 27

  const CONTRACT_ADDRESS =
    "0x07c74a2d7242cf5674543d2079bfea7fb6043323085c061b6a983d504df27f62";
  const {
    handleSubmit, // handels the form submit event
    register, // ties the inputs to react-form
    formState: { errors, isSubmitting }, // gets errors and "loading" state
  } = useForm<IScholes>();

  const { account } = useStarknet();

  const { colorMode } = useColorMode();
  const textSize = useBreakpointValue({
    base: "xs",
    sm: "md",
  });

  function parseFelt(feltString: string) {
    // const feltInt = parseInt(feltString)
    const unitBigNumber = new BigNumber(UNIT)
    const bigPrime = new BigNumber(CAIRO_PRIME)
    const halfPrimeBigNumber = bigPrime.dividedBy(2)
    const bigFelt = new BigNumber(feltString)
    if (bigFelt.isGreaterThan(halfPrimeBigNumber)) {
      if (bigFelt.isLessThan(bigPrime)) {

        const result = bigFelt.minus(bigPrime)
        return result.dividedBy(unitBigNumber).toFixed()
      }
    }
    const result = bigFelt.dividedBy(unitBigNumber)
    return result.toFixed()
  }

  async function onRegistered(scholesParams: IScholes) {

    toast({
      title: "Hang tight, this might take a bit",
      status: "success",
      duration: 30000,
      isClosable: false
    });

    let scholesInput = { ...scholesParams }
    scholesInput.t_annualised = scholesInput.t_annualised * UNIT
    scholesInput.volatility = (scholesInput.volatility / 100) * UNIT // to convert to %
    scholesInput.spot = scholesInput.spot * UNIT
    scholesInput.strike = scholesInput.strike * UNIT
    scholesInput.rate = (scholesInput.rate / 100) * UNIT // to convert to %

    console.log('scholesInput   ', JSON.stringify(scholesInput))
    // or try to connect to an approved wallet silently (on mount probably)
    // const someconnect = connect({ showList: false })
    const [userWalletContractAddress] = await getStarknet().enable()
    if (getStarknet().isConnected === false) {
      //throw Error("starknet wallet not connected")
    }
    const contract = createContract(CONTRACT_ADDRESS, scholesAbi as any)
    console.log('vega', BigInt(scholesInput.t_annualised).toString(), BigInt(scholesInput.volatility).toString(), BigInt(scholesInput.spot).toString(), BigInt(scholesInput.strike).toString(), BigInt(scholesInput.rate).toString())

    //////////////////////OPTION PRICES ///////////////////////////////////////////////////////////
    const priceresult = await callContract(contract, 'option_prices', BigInt(scholesInput.t_annualised).toString(), BigInt(scholesInput.volatility).toString(), BigInt(scholesInput.spot).toString(), BigInt(scholesInput.strike).toString(), BigInt(scholesInput.rate).toString())
    //    const priceresult = await callContract(contract, 'option_prices', parseToUint256(scholesInput.t_annualised.toString()).toString(), parseToUint256(scholesInput.volatility.toString()).toString(), parseToUint256(scholesInput.spot.toString()).toString(), parseToUint256(scholesInput.strike.toString()).toString(), BigInt(scholesInput.rate).toString())

    console.log('option_prices   ', JSON.stringify(priceresult))
    setCallPrice((parseInt(priceresult[0]) / UNIT).toPrecision(10).toString())
    setPutPrice((parseInt(priceresult[1]) / UNIT).toPrecision(10).toString())
    //////////////////////VEGA ///////////////////////////////////////////////////////////

    const vegaresult = await callContract(contract, 'vega', BigInt(scholesInput.t_annualised).toString(), BigInt(scholesInput.volatility).toString(), BigInt(scholesInput.spot).toString(), BigInt(scholesInput.strike).toString(), BigInt(scholesInput.rate).toString())
    console.log('vega   ', JSON.stringify(vegaresult))
    setVega(parseFelt(vegaresult[0]))

    //////////////////////THETA ///////////////////////////////////////////////////////////
    const thetaResult = await callContract(contract, 'theta', BigInt(scholesInput.t_annualised).toString(), BigInt(scholesInput.volatility).toString(), BigInt(scholesInput.spot).toString(), BigInt(scholesInput.strike).toString(), BigInt(scholesInput.rate).toString())
    console.log('theta   ', JSON.stringify(thetaResult))
    setCallTheta(parseFelt(thetaResult[0]))
    setPutTheta(parseFelt(thetaResult[1]))

    //////////////////////rho ///////////////////////////////////////////////////////////
    const rhoResult = await callContract(contract, 'rho', BigInt(scholesInput.t_annualised).toString(), BigInt(scholesInput.volatility).toString(), BigInt(scholesInput.spot).toString(), BigInt(scholesInput.strike).toString(), BigInt(scholesInput.rate).toString())
    console.log('rho   ', JSON.stringify(rhoResult))
    setCallRho((parseFelt(rhoResult[0])))
    setPutRho((parseFelt(rhoResult[1])))

    //////////////////////vomma  ///////////////////////////////////////////////////////////
    const vommaResult = await callContract(contract, 'vomma', BigInt(scholesInput.t_annualised).toString(), BigInt(scholesInput.volatility).toString(), BigInt(scholesInput.spot).toString(), BigInt(scholesInput.strike).toString(), BigInt(scholesInput.rate).toString())
    console.log('vomma   ', JSON.stringify(vommaResult))
    setVomma(parseFelt(vommaResult[0]))

    //////////////////////vanna  ///////////////////////////////////////////////////////////
    const vannaResult = await callContract(contract, 'vanna', BigInt(scholesInput.t_annualised).toString(), BigInt(scholesInput.volatility).toString(), BigInt(scholesInput.spot).toString(), BigInt(scholesInput.strike).toString(), BigInt(scholesInput.rate).toString())
    console.log('vanna   ', JSON.stringify(vannaResult))
    setVanna(parseFelt(vannaResult[1])) // the second one might be more accurate

    //////////////////////gamma  ///////////////////////////////////////////////////////////
    const gammaResult = await callContract(contract, 'gamma', BigInt(scholesInput.t_annualised).toString(), BigInt(scholesInput.volatility).toString(), BigInt(scholesInput.spot).toString(), BigInt(scholesInput.strike).toString(), BigInt(scholesInput.rate).toString())
    // const gammaResult = await callContract(contract, 'gamma', scholesInput.t_annualised.toString(), scholesInput.volatility.toString(), scholesInput.spot.toString(), scholesInput.strike.toString(), scholesInput.rate.toString())
    console.log('gamma   ', JSON.stringify(gammaResult))
    setGamma(parseFelt(gammaResult[0]))

    //////////////////////delta ///////////////////////////////////////////////////////////
    const deltaResult = await callContract(contract, 'delta', BigInt(scholesInput.t_annualised).toString(), BigInt(scholesInput.volatility).toString(), BigInt(scholesInput.spot).toString(), BigInt(scholesInput.strike).toString(), BigInt(scholesInput.rate).toString())
    console.log('delta   ', JSON.stringify(deltaResult))
    setCallDelta(parseFelt(deltaResult[0]))
    setPutDelta(parseFelt(deltaResult[1]))

    /////////////////////////Calculate gamma chart  //////////////////////////////////
    async function gammachartData() {
      let spots = []
      let gammas = []
      // console.log('gammachartdata')
      let increase = 10
      let newSpot = Number(scholesParams.spot) - 50
      for (let i = 0; i < 10; i++) {
        newSpot += 10
        spots.push(newSpot)
        const gammaResult = await callContract(contract, 'gamma', BigInt(scholesInput.t_annualised).toString(), BigInt(scholesInput.volatility).toString(), BigInt(newSpot * UNIT).toString(), BigInt(scholesInput.strike).toString(), BigInt(scholesInput.rate).toString())
        console.log('gamma   ', JSON.stringify(gammaResult))
        gammas.push(parseFelt(gammaResult[0]))
      }

      setChartData({
        labels: spots,
        datasets: [
          {
            label: "Asset Price",
            data: gammas,
            fill: true,
            backgroundColor: "rgba(75,192,192,0.2)",
            borderColor: "rgba(75,192,192,1)"
          }
        ],
        options: {
          plugins: {
            title: {
              display: true,
              text: 'Custom Chart Title',
              padding: {
                top: 10,
                bottom: 30
              }
            }
          }
        }


      })
    }

    await gammachartData()
    toast.closeAll()
  }

  return (
    <Box>
      <Text as="h2" marginTop={4} fontSize="2xl">
        Black Scholes
      </Text>
      <Box d="flex" flexDirection="column">
        <Text>Test Contract:</Text>
        <Code marginTop={4} w="fit-content">
          {/* {`${CONTRACT_ADDRESS.substring(0, 4)}...${CONTRACT_ADDRESS.substring(
            CONTRACT_ADDRESS.length - 4
          )}`} */}
          <Link
            isExternal
            textDecoration="none !important"
            outline="none !important"
            boxShadow="none !important"
            href={`https://goerli.voyager.online/contract/${CONTRACT_ADDRESS}`}
          >
            {CONTRACT_ADDRESS}
          </Link>
        </Code>
        {account && (
          <form onSubmit={handleSubmit(onRegistered)} noValidate>
            {/* noValidate will stop the browser validation, so we can write our own designs and logic */}
            <FormControl >
              <FormLabel >
                Calculate the price of your option
                {/* the form label from chakra ui is tied to the input via the htmlFor attribute */}
              </FormLabel>
            </FormControl >
            <FormControl isInvalid={!!errors.t_annualised ? true : false} >
              <FormLabel htmlFor="t_annualised">
                Time annualized
                {/* the form label from chakra ui is tied to the input via the htmlFor attribute */}
              </FormLabel>

              {/* you should use the save value for the id and the property name */}
              <Input
                id="t_annualised"
                placeholder="4.23"
                {
                ...register("t_annualised", {
                  required: "Don't forget the time annualized",
                }) /* this register function will take care of the react-form binding to the ui */
                }
              ></Input>
              {/* react-form will calculate the errors on submit or on dirty state */}
              <FormErrorMessage>{errors.t_annualised && errors?.t_annualised?.message}</FormErrorMessage>
            </FormControl>
            <FormControl isInvalid={!!errors.volatility ? true : false}>
              <FormLabel htmlFor="volatility">
                Volatility
              </FormLabel>
              <Input
                id="volatility"
                placeholder="15"
                {...register("volatility", {
                  required: "please enter the implied volitility?",
                })}
              ></Input>
              <FormErrorMessage>{errors.volatility && errors?.volatility?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.spot ? true : false}>
              <FormLabel htmlFor="spot">
                Spot
              </FormLabel>
              <Input
                id="spot"
                placeholder="23.1"
                {...register("spot", {
                  required: "please enter the spot price",
                })}
              ></Input>
              <FormErrorMessage>{errors.spot && errors?.spot?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.strike ? true : false}>
              <FormLabel htmlFor="strike">
                Strike
              </FormLabel>
              <Input
                id="strike"
                placeholder="23.1"
                {...register("strike", {
                  required: "please enter the strike price?",
                })}
              ></Input>
              <FormErrorMessage>{errors.strike && errors?.strike?.message}</FormErrorMessage>
            </FormControl>


            <FormControl isInvalid={!!errors.rate ? true : false}>
              <FormLabel htmlFor="rate">
                Rate
              </FormLabel>
              <Input
                id="rate"
                placeholder="5"
                {...register("rate", {
                  required: "please enter the interest rate?",
                })}
              ></Input>
              <FormErrorMessage>{errors.rate && errors?.rate?.message}</FormErrorMessage>
            </FormControl>

            <Button mt={10} colorScheme="blue" isLoading={isSubmitting} type="submit">
              CALCULATE 🐱‍🏍
            </Button>

            <Text
              letterSpacing="wide"
              textDecoration="underline"
              as="h3"
              fontWeight="semibold"
              fontSize="l"
            >
              <Divider my="1rem" />

              Call Option Price {callPrice}
              <Divider my="1rem" />
              Put Option Price {putPrice}
              <Divider my="1rem" />

              Call Delta {callDelta}
              <Divider my="1rem" />
              Put Delta {putDelta}
              <Divider my="1rem" />

              Call Theta {callTheta}
              <Divider my="1rem" />
              Put Theta {putTheta}
              <Divider my="1rem" />

              Gamma {gamma}
              <Divider my="1rem" />

              Call Rho {callRho}
              <Divider my="1rem" />
              Put Rho {putRho}
              <Divider my="1rem" />

              Vega {vega}
              <Divider my="1rem" />
              Vomma {vomma}
              <Divider my="1rem" />
              Vanna {vanna}
              <Divider my="1rem" />
            </Text>

            <Line data={chartData} options={{
              plugins: {
                title: {
                  display: true,
                  text: 'Gamma vs Spot/Asset Price',
                  padding: {
                    top: 10,
                    bottom: 30
                  }
                }
              }
            }}

            />
          </form>

        )}
        {!account && (
          <Box
            backgroundColor={colorMode === "light" ? "gray.200" : "gray.500"}
            padding={4}
            marginTop={4}
            borderRadius={4}
          >
            <Box fontSize={textSize}>
              Connect your wallet to use scholes
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default BlackScholesForm;
