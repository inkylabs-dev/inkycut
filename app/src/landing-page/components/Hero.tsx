import React from 'react';
import { Player } from '@remotion/player';
import { TypeAnimation } from 'react-type-animation';
import { MainComposition } from '../../packages/editor';
import { DocsUrl } from '../../shared/common';
// @ts-ignore - TypeScript doesn't recognize the wasp modules
import { useAuth } from 'wasp/client/auth';
// @ts-ignore - TypeScript doesn't recognize the wasp modules
import { Link } from 'wasp/client/router';
import { landingCompositionData } from '../contentSections';

export default function Hero() {
  const { data: user } = useAuth();

  return (
    <div className='relative pt-14 w-full'>
      <TopGradient />
      <BottomGradient />
      <div className='py-24 sm:py-32'>
        <div className='mx-auto max-w-8xl px-6 lg:px-8'>
          <div className='lg:mb-18 mx-auto max-w-3xl text-center'>
            <h1 className='text-4xl font-bold text-gray-900 sm:text-6xl dark:text-white'>
              Create stunning videos<br></br>
              <TypeAnimation
                sequence={[
                  'with just a chat',
                  2000,
                  'using a vibe editor.',
                  2000,
                  'using InkyCut.',
                  2000,
                ]}
                wrapper="span"
                speed={50}
                style={{ fontStyle: 'italic' }}
                repeat={Infinity}
              />
            </h1>
            <p className='mt-6 mx-auto max-w-2xl text-lg leading-8 text-gray-600 dark:text-white'>
              Free your creativity and free forever. No video editing skills required.
            </p>
            <div className='mt-10 flex items-center justify-center gap-x-6'>
              <Link
                to={user ? '/vibe' : '/login'}
                className='rounded-md px-3.5 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-200 hover:ring-2 hover:ring-yellow-300 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:text-white'
              >
                Get Started <span aria-hidden='true'>→</span>
              </Link>
            </div>
          </div>
          <div className='mt-14 flow-root sm:mt-14'>
            <div className='-m-2 flex justify-center rounded-xl lg:-m-4 lg:rounded-2xl lg:p-4'>
              <div className='w-full max-w-4xl aspect-video'>
                <Player
                  component={MainComposition}
                  inputProps={{ 
                    data: landingCompositionData,
                    files: []
                  }}
                  durationInFrames={90}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  fps={30}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '8px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                  }}
                  controls={true}
                  loop={true}
                  autoPlay={true}
                  showVolumeControls={false}
                  allowFullscreen={false}
                  clickToPlay={false}
                  doubleClickToFullscreen={false}
                  spaceKeyToPlayOrPause={false}
                  acknowledgeRemotionLicense={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopGradient() {
  return (
    <div
      className='absolute top-0 right-0 -z-10 transform-gpu overflow-hidden w-full blur-3xl sm:top-0'
      aria-hidden='true'
    >
      <div
        className='aspect-[1020/880] w-[55rem] flex-none sm:right-1/4 sm:translate-x-1/2 dark:hidden bg-gradient-to-tr from-amber-400 to-purple-300 opacity-40'
        style={{
          clipPath: 'polygon(80% 20%, 90% 55%, 50% 100%, 70% 30%, 20% 50%, 50% 0)',
        }}
      />
    </div>
  );
}

function BottomGradient() {
  return (
    <div
      className='absolute inset-x-0 top-[calc(100%-40rem)] sm:top-[calc(100%-65rem)] -z-10 transform-gpu overflow-hidden blur-3xl'
      aria-hidden='true'
    >
      <div
        className='relative aspect-[1020/880] sm:-left-3/4 sm:translate-x-1/4 dark:hidden bg-gradient-to-br from-amber-400 to-purple-300  opacity-50 w-[72.1875rem]'
        style={{
          clipPath: 'ellipse(80% 30% at 80% 50%)',
        }}
      />
    </div>
  );
}
