"use client";

import dynamic from "next/dynamic";
import { APP_NAME } from "~/lib/constants";
import { Suspense, useState, useEffect } from "react";
import Loader from "~/components/ui/Loader";

// Loading component with animated progress
// const LoadingScreen = () => {
//   const [progress, setProgress] = useState(0);
  
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setProgress(prev => {
//         if (prev >= 100) {
//           clearInterval(interval);
//           return 100;
//         }
//         return prev + Math.random() * 15;
//       });
//     }, 150);
    
//     return () => clearInterval(interval);
//   }, []);
  
//   return (
//     <div className="flex items-center justify-center h-screen bg-[#0a0a0a] relative overflow-hidden font-titillium">
//       {/* Background gradients */}
//       <div className="absolute top-[20%] left-[10%] w-[200px] h-[200px] bg-[#341e64]/30 blur-3xl opacity-100 rounded-full" />
//       <div className="absolute bottom-[30%] right-[15%] w-[150px] h-[150px] bg-[#c199e4]/40 blur-3xl opacity-100 rounded-full" />
      
//       <div className="text-center relative z-10">
//         {/* Logo */}
//         {/* <div className="w-16 h-16 bg-gradient-to-br from-[#c199e4] to-[#341e64] rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-8">
//           <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
//           </svg>
//         </div> */}
        
//         {/* Progress Circle */}
//         <div className="relative w-32 h-32 mx-auto mb-6">
//           <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
//             {/* Background circle */}
//             <circle
//               cx="50"
//               cy="50"
//               r="40"
//               stroke="rgba(255,255,255,0.1)"
//               strokeWidth="8"
//               fill="transparent"
//             />
//             {/* Progress circle */}
//             <circle
//               cx="50"
//               cy="50"
//               r="40"
//               stroke="url(#gradient)"
//               strokeWidth="8"
//               fill="transparent"
//               strokeDasharray={251.2}
//               strokeDashoffset={251.2 - (progress / 100) * 251.2}
//               strokeLinecap="round"
//               className="transition-all duration-300 ease-out"
//             />
//             {/* Gradient definition */}
//             <defs>
//               <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
//                 <stop offset="0%" stopColor="#c199e4" />
//                 <stop offset="100%" stopColor="#341e64" />
//               </linearGradient>
//             </defs>
//           </svg>
          
//           {/* Progress text */}
//           <div className="absolute inset-0 flex items-center justify-center">
//             <span className="text-2xl font-bold text-white">
//               {Math.round(progress)}%
//             </span>
//           </div>
//         </div>
        
//         {/* Loading text */}
//         <div className="space-y-2">
//           <h2 className="text-xl font-bold text-white">Loading DCA Agent</h2>
//           <p className="text-sm text-white/70">
//             {progress < 30 && "Initializing..."}
//             {progress >= 30 && progress < 60 && "Loading components..."}
//             {progress >= 60 && progress < 90 && "Setting up interface..."}
//             {progress >= 90 && "Almost ready!"}
//           </p>
//         </div>
        
//         {/* Animated dots */}
//         <div className="flex justify-center space-x-1 mt-4">
//           <div className="w-2 h-2 bg-[#c199e4] rounded-full animate-pulse"></div>
//           <div className="w-2 h-2 bg-[#c199e4] rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
//           <div className="w-2 h-2 bg-[#c199e4] rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
//         </div>
//       </div>
//     </div>
//   );
// };

// note: dynamic import is required for components that use the Frame SDK
const AppComponent = dynamic(() => import("~/components/App"), {
  ssr: false,
  loading: Loader,
});

export default function App(
  { title }: { title?: string } = { title: APP_NAME }
) {
  return (
    <Suspense fallback={<Loader />}>
      <AppComponent title={title} />
    </Suspense>
  );
}
