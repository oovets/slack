import Image from "next/image";
import type { CSSProperties } from "react";

type FooterProps = {
  src?: string;
  logoWidth?: string;
  logoHeight?: string;
  logoPosition?: 'left' | 'center' | 'right';
  logoMarginTop?: string;
  footerBackgroundUrl?: string;
  footerBackgroundColor?: string;
};

export function Footer(props: FooterProps) {
  void props;
  // const getPositionClass = () => {
  //   switch (logoPosition) {
  //     case 'left':
  //       return 'left-[10%] -translate-x-0';
  //     case 'right':
  //       return 'right-[10%] translate-x-0';
  //     case 'center':
  //     default:
  //       return 'left-1/2 -translate-x-1/2';
  //   }
  // };

  // Debug logging
  // Prepare footer styles
  const footerStyle: CSSProperties = {};
  
  // if (footerBackgroundUrl && footerBackgroundUrl.trim() !== '') {
  //   footerStyle.backgroundImage = `url('${footerBackgroundUrl}')`;
  //   footerStyle.backgroundRepeat = 'repeat-x';
  //   footerStyle.backgroundPosition = 'top';
  // }
  
  // if (footerBackgroundColor && footerBackgroundColor.trim() !== '') {
  //   footerStyle.backgroundColor = footerBackgroundColor;
  // }

  return (
    <>
      <footer 
        id="dashboard-footer"
        className="relative flex flex-col justify-center mt-27.75  h-74 w-full"
      >
        {/* {src && ( ${getPositionClass()} */}

        <div className="flex -translate-y-21 items-center justify-center">
          <Image
            id="dashboard-footer-logo-aspace"
            className="top-0 z-10"
            width={154}
            height={33}
            alt="A SPACE"
            src="/a_space-logo.svg"
            style={{ height: '45px', width: 'auto', objectFit: 'contain' }}
          />
        </div>

        <div className="z-10 absolute bottom-0 w-full flex justify-between items-end p-[18px]">
          <p className="eidra-sans font-medium text-white text-[17px] leading-[14px]">
            Powered by ASPACE Vision™
          </p>

          <span className="eidra-sans text-white font-medium text-[17px] leading-[14px]">2026</span>
        </div>
      </footer>
      <div 
        id="dashboard-footer-background"
        className="w-screen z-0 h-74 absolute bottom-0 left-0 right-0"
        style={footerStyle}
      />
    </>
  );
}
