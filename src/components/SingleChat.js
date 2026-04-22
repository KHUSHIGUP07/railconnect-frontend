import API from "../../config";

import { FormControl } from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import "./styles.css";
import { IconButton, Spinner, useToast } from "@chakra-ui/react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowBackIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import Lottie from "react-lottie";
import animationData from "../animations/typing.json";

import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";

const ENDPOINT = "https://railconnect-iyua.onrender.com";
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);

  const toast = useToast();

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  const {
    selectedChat,
    setSelectedChat,
    user,
    notification,
    setNotification,
  } = ChatState();

  // 🎥 MEETING FUNCTION
  const createMeeting = async () => {
    if (!selectedChat) return;

    const url = `https://meet.jit.si/${selectedChat._id}#config.prejoinPageEnabled=false`;
    window.open(url, "_blank");

    try {
      await await axios.post(
  `${API}/api/message`,
        {
          content: `📢 Meeting started! Join here 👉 ${url}`,
          chatId: selectedChat._id,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      setFetchAgain(!fetchAgain);
    } catch (error) {
      console.log("Error sending meeting link");
    }
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      const { data } = await axios.get(
        `${API}/api/message/${selectedChat._id}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      setMessages(data);
      socket.emit("join chat", selectedChat._id);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      socket.emit("stop typing", selectedChat._id);

      try {
        const { data } = await axios.post(
          `${API}/api/message`,
          {
            content: newMessage,
            chatId: selectedChat._id,
          },
          {
            headers: {
              "Content-type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
          }
        );

        setNewMessage("");
        socket.emit("new message", data);
        setMessages([...messages, data]);
      } catch {
        toast({
          title: "Error sending message",
          status: "error",
        });
      }
    }
  };

  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);

    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
  }, []);

  useEffect(() => {
    fetchMessages();
    selectedChatCompare = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    socket.on("message recieved", (msg) => {
      if (
        !selectedChatCompare ||
        selectedChatCompare._id !== msg.chat._id
      ) {
        if (!notification.includes(msg)) {
          setNotification([msg, ...notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages([...messages, msg]);
      }
    });
  }, [messages]);

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }

    setTimeout(() => {
      if (typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, 3000);
  };

  return (
    <>
      {selectedChat ? (
        <>
          {/* HEADER */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            w="100%"
            pb={3}
            px={3}
          >
            {/* LEFT */}
            <Box display="flex" alignItems="center" gap="10px">
              <IconButton
                d={{ base: "flex", md: "none" }}
                icon={<ArrowBackIcon />}
                onClick={() => setSelectedChat("")}
              />

              <Text fontSize={{ base: "28px", md: "30px" }}>
                {!selectedChat.isGroupChat
                  ? getSender(user, selectedChat.users)
                  : selectedChat.chatName.toUpperCase()}
              </Text>
            </Box>

            {/* RIGHT CLEAN UI */}
            <Box display="flex" alignItems="center" gap="16px">
              {!selectedChat.isGroupChat ? (
                <Box
                  bg="gray.100"
                  borderRadius="12px"
                  p="6px"
                  boxShadow="sm"
                  _hover={{ bg: "gray.200" }}
                >
                  <ProfileModal
                    user={getSenderFull(user, selectedChat.users)}
                  />
                </Box>
              ) : (
                <Box
                  bg="gray.100"
                  borderRadius="12px"
                  p="6px"
                  boxShadow="sm"
                  _hover={{ bg: "gray.200" }}
                >
                  <UpdateGroupChatModal
                    fetchMessages={fetchMessages}
                    fetchAgain={fetchAgain}
                    setFetchAgain={setFetchAgain}
                  />
                </Box>
              )}

              {/* MEET BUTTON */}
              <Box
                bg="linear-gradient(135deg, #3a86ff, #4361ee)"
                borderRadius="12px"
                px="14px"
                py="8px"
                cursor="pointer"
                onClick={createMeeting}
                display="flex"
                alignItems="center"
                gap="6px"
                boxShadow="md"
                transition="0.2s"
                _hover={{
                  transform: "scale(1.05)",
                  boxShadow: "lg",
                }}
              >
                <Text fontSize="16px">🎥</Text>
                <Text color="white" fontSize="13px" fontWeight="500">
                  Meet
                </Text>
              </Box>
            </Box>
          </Box>

          {/* CHAT BODY */}
          <Box
            d="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg="#E8E8E8"
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
          >
            {loading ? (
              <Spinner size="xl" alignSelf="center" m="auto" />
            ) : (
              <div className="messages">
                <ScrollableChat messages={messages} />
              </div>
            )}

            <FormControl onKeyDown={sendMessage} mt={3}>
              {istyping && (
                <Lottie options={defaultOptions} width={70} />
              )}

              <Input
                variant="filled"
                bg="#E0E0E0"
                placeholder="Enter a message.."
                value={newMessage}
                onChange={typingHandler}
              />
            </FormControl>
          </Box>
        </>
      ) : (
        <Box d="flex" alignItems="center" justifyContent="center" h="100%">
          <Text fontSize="3xl">
            Click on a user to start chatting
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;