import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Gamepad2, Shield, Zap, Trophy, Bot, TrendingUp } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen py-12 px-4 text-[hsl(var(--color-foreground))] bg-[hsl(var(--color-background))]">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold text-[hsl(var(--color-primary))]">♟️ ChessMaster</h1>
          <p className="text-xl text-[hsl(var(--color-muted-foreground))]">
            A professional online chess platform built with the MERN stack
          </p>

          <div className="flex gap-2 justify-center flex-wrap">
            <Badge>MongoDB</Badge>
            <Badge>Express</Badge>
            <Badge>React</Badge>
            <Badge>Node.js</Badge>
            <Badge>Stockfish</Badge>
            <Badge>ELO Rating</Badge>
          </div>
        </div>

        {/* Main Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>About the Platform</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-[hsl(var(--color-muted-foreground))]">
            <p>
              ChessMaster is a professional-grade online chess platform that allows players
              to compete against each other or challenge an AI opponent powered by Stockfish.
              Built with modern web technologies, it provides a seamless and enjoyable chess
              experience with real-time move validation and ELO rating system.
            </p>
            <p>
              Whether you're a beginner learning the game or a seasoned player looking for
              challenging opponents, ChessMaster offers features that cater to all skill levels.
              Test your skills against other players or practice against our intelligent AI that
              adapts to your rating level.
            </p>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: Gamepad2, title: "Play Online", desc: "Challenge players worldwide in real-time matches with instant move validation and automatic game state management." },
            { icon: Bot, title: "AI Opponent", desc: "Practice against Stockfish engine that adjusts difficulty based on your rating. Perfect for improving your skills." },
            { icon: TrendingUp, title: "ELO Rating System", desc: "Track your progress with our accurate ELO rating system. Watch your rating climb as you improve and win matches." },
            { icon: Zap, title: "Valid Moves Only", desc: "Powered by chess.js library, ensuring all moves follow official chess rules with automatic checkmate detection." },
            { icon: Shield, title: "Secure & Private", desc: "Your account is protected with industry-standard JWT authentication and encrypted passwords." },
            { icon: Trophy, title: "Track Progress", desc: "Monitor your rating, wins, losses, and complete game history. Analyze your games and improve your strategy." },
          ].map(({ icon: Icon, title, desc }, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-[hsl(var(--color-primary)/0.1)] hover:bg-[hsl(var(--color-primary)/0.15)] transition-colors">
                    <Icon className="h-8 w-8 text-[hsl(var(--color-primary))]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2 text-[hsl(var(--color-foreground))]">{title}</h3>
                    <p className="text-sm text-[hsl(var(--color-muted-foreground))]">{desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Technology Stack */}
        <Card>
          <CardHeader>
            <CardTitle>Technology Stack</CardTitle>
            <CardDescription>Built with modern, production-ready technologies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--color-primary))]">Frontend</h3>
                <ul className="space-y-2">
                  {[
                    'React 18 with Hooks',
                    'Vite for blazing-fast builds',
                    'Tailwind CSS v4',
                    'shadcn/ui components',
                    'React Router v6',
                    'chess.js for game logic',
                    'Axios for API calls'
                  ].map((tech, i) => (
                    <li key={i} className="flex items-center text-sm text-[hsl(var(--color-muted-foreground))]">
                      <span className="mr-2 text-[hsl(var(--color-primary))]">▹</span>
                      {tech}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--color-primary))]">Backend</h3>
                <ul className="space-y-2">
                  {[
                    'Node.js & Express',
                    'MongoDB with Mongoose',
                    'JWT Authentication',
                    'Stockfish Chess Engine',
                    'ELO Rating Algorithm',
                    'bcrypt for password hashing',
                    'RESTful API design'
                  ].map((tech, i) => (
                    <li key={i} className="flex items-center text-sm text-[hsl(var(--color-muted-foreground))]">
                      <span className="mr-2 text-[hsl(var(--color-primary))]">▹</span>
                      {tech}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-2 text-[hsl(var(--color-muted-foreground))]">
          <p className="text-sm">Built with ❤️ using MERN Stack</p>
          <p className="text-xs opacity-80">© 2025 ChessMaster. All rights reserved.</p>
        </div>

      </div>
    </div>
  );
};

export default About;