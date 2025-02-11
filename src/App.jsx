import { useEffect, useState, useRef } from "react";
import { supabase } from "../supaBaseClient";

function App() {
  const [session, setSession] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [usersOnline, setUsersOnline] = useState([]);

  const chatContainerRef = useRef(null);
  const scroll = useRef();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // sign in
  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `https://googlechat-l67r.vercel.app/`,
      },
    });
  };

  // sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
  };

  useEffect(() => {
    if (!session?.user) {
      setUsersOnline([]);
      return;
    }
    const roomOne = supabase.channel("room_one", {
      config: {
        presence: {
          key: session?.user?.id,
        },
      },
    });

    roomOne.on("broadcast", { event: "message" }, (payload) => {
      setMessages((prevMessages) => [...prevMessages, payload.payload]);
      // console.log(messages);
    });

    // track user presence subscribe!
    roomOne.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await roomOne.track({
          id: session?.user?.id,
        });
      }
    });

    // handle user presence
    roomOne.on("presence", { event: "sync" }, () => {
      const state = roomOne.presenceState();
      setUsersOnline(Object.keys(state));
    });

    return () => {
      roomOne.unsubscribe();
    };
  }, [session]);

  // send message
  const sendMessage = async (e) => {
    e.preventDefault();

    supabase.channel("room_one").send({
      type: "broadcast",
      event: "message",
      payload: {
        message: newMessage,
        user_name: session?.user?.user_metadata?.email,
        avatar: session?.user?.user_metadata?.avatar_url,
        timestamp: new Date().toISOString(),
      },
    });
    setNewMessage("");
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString("en-us", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop =
          chatContainerRef.current.scrollHeight;
      }
    }, [100]);
  }, [messages]);

  if (!session) {
    return (
      <div className="w-full flex flex-col h-screen justify-center bg-black items-center">
        <div className="mb-2.5 flex gap-1 text-white">
          <img
            src="./images.png"
            alt=""
            width={35}
            height={35}
            className="rounded-4xl mr-1 mb-1.5"
          />
          <p className="font-bold mt-1.5">RED PULSE</p>
        </div>
        <div className="text-white mb-4 font-bold">
          YOUR RIGHT PLACE TO CONNECT
        </div>
        <button
          onClick={signIn}
          className="text-white rounded-lg font-bold border-2 cursor-pointer p-4 bg-[#1a1a1a]"
        >
          SIGN IN WITH GOOGLE TO CHAT
        </button>
      </div>
    );
  } else {
    return (
      <div className="w-full flex h-screen justify-center items-center p-4 bg-black">
        <div className="border-[1px] border-gray-700 max-w-6xl w-full min-h-[600px] rounded-lg">
          {/* Header */}
          <div className="flex justify-between h-20 border-b-[1px] border-gray-700">
            <div className="p-4">
              <p className="text-gray-300">
                Signed in as {session?.user?.user_metadata?.full_name}
              </p>
              <p className="text-white italic text-sm ">
                {usersOnline.length} users online
              </p>
            </div>
            <button onClick={signOut} className="m-2 sm:mr-4 text-white">
              Sign out
            </button>
          </div>
          {/* main chat */}
          <div
            ref={chatContainerRef}
            className="p-4 flex flex-col overflow-y-auto h-[500px]"
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`my-2 flex w-full items-start ${
                  msg?.user_name === session?.user?.email
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {/* received message - avatar on left */}
                {msg?.user_name !== session?.user?.email && (
                  <img
                    src={msg?.avatar}
                    alt="/"
                    className="w-10 h-10 rounded-full mr-2"
                  />
                )}

                <div className="flex flex-col w-full">
                  <div
                    className={`p-1 max-w-[70%] rounded-xl ${
                      msg?.user_name === session?.user?.email
                        ? "bg-gray-700 text-white ml-auto"
                        : "bg-gray-500 text-white mr-auto"
                    }`}
                  >
                    <p>{msg.message}</p>
                  </div>
                  {/* timestamp */}
                  <div
                    className={`text-xs opactiy-75 pt-1 ${
                      msg?.user_name === session?.user?.email
                        ? "text-right mr-2"
                        : "text-left ml-2"
                    }`}
                  >
                    {formatTime(msg?.timestamp)}
                  </div>
                </div>

                {msg?.user_name === session?.user?.email && (
                  <img
                    src={msg?.avatar}
                    alt="/"
                    className="w-10 h-10 rounded-full ml-2"
                  />
                )}
              </div>
            ))}
          </div>
          {/* message input */}
          <form
            onSubmit={sendMessage}
            className="flex flex-col sm:flex-row p-4 border-t-[1px] border-gray-700 text-white"
          >
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              type="text"
              placeholder="Type a message..."
              className="p-2 w-full bg-[#00000040] rounded-lg text-white "
            />
            <button className="mt-4 sm:mt-0 sm:ml-8 text-white max-h-12">
              Send
            </button>
            <span ref={scroll}></span>
          </form>
        </div>
      </div>
    );
  }
}

export default App;
